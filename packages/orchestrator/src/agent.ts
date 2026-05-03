// Orchestrator Agent - Core Logic

import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import {
  type Task,
  type SubTask,
  type AgentIdentity,
  type AgentEvent,
  type PaymentRecord,
  type DiscoveredTool,
  type CatalogResponse,
  callMCPService,
  PaymentRequiredError,
  discoverToolsByCapability,
  discoverToolsFromRegistry,
  discoverAgentsFromENS,
  createPaymentProof,
  storeConversationLog,
  recordReputation,
  ZERO_G,
  TOOL_PRICES,
} from "@agentmesh/shared";
import { payWithAnyToken } from "@agentmesh/executor/tools";
import { LocalToolRouter } from "./local-router.js";
import { ToolCatalog } from "./tool-catalog.js";

export interface OrchestratorConfig {
  axlPort: number;
  zgServiceUrl: string;
  zgApiSecret: string;
  localMode?: boolean; // Skip AXL, call tools directly
  walletAddress?: string; // Orchestrator's wallet for x402 payments
}

export interface PaymentApprovalRequest {
  toolName: string;
  amount: string;
  recipient: string;
  /** EIP-712 domain + types + message for the user to sign */
  eip712: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    message: Record<string, unknown>;
  };
}

export interface PaymentApprovalResponse {
  approved: boolean;
  signature?: string;
}

export type PaymentApprovalCallback = (
  request: PaymentApprovalRequest,
) => Promise<PaymentApprovalResponse>;

export class OrchestratorAgent {
  private llm: OpenAI;
  private config: OrchestratorConfig;
  private toolRegistry: AgentIdentity[] = [];
  private toolCatalog: ToolCatalog = new ToolCatalog();
  private eventListeners: ((event: AgentEvent) => void)[] = [];
  private localRouter?: LocalToolRouter;
  private paymentApprovalCallback?: PaymentApprovalCallback;
  private payerAddress?: string;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.llm = new OpenAI({
      baseURL: `${config.zgServiceUrl}/v1/proxy`,
      apiKey: config.zgApiSecret,
    });
  }

  /**
   * Set local tool router for development/demo mode.
   */
  setLocalRouter(router: LocalToolRouter): void {
    this.localRouter = router;
  }

  /**
   * Get the local tool router (for MCP server endpoint).
   */
  getLocalRouter(): LocalToolRouter | undefined {
    return this.localRouter;
  }

  /**
   * Register a built-in provider that's always present in the catalog.
   */
  registerBuiltinProvider(provider: {
    name: string;
    ensName: string;
    endpoint: string;
    categories: string[];
    tools: Array<{
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
    }>;
  }): void {
    this.toolCatalog.registerBuiltinProvider(provider);
  }

  /**
   * Register a known tool provider (populated from ENS or local config).
   */
  registerTool(tool: AgentIdentity): void {
    this.toolRegistry.push(tool);
    this.emit({ type: "tool_discovered", tool });
  }

  /**
   * Return current tool registry (for API).
   */
  getRegistry(): AgentIdentity[] {
    return this.toolRegistry;
  }

  /**
   * Return structured catalog response with providers + tools for frontend.
   */
  getCatalog(): CatalogResponse {
    return this.toolCatalog.getCatalogResponse();
  }

  /**
   * Refresh tool registry from on-chain AgentRegistry + ENS text records.
   * Refresh tool registry — discovers new third-party MCP providers from
   * on-chain AgentRegistry and ENS.  Builtin providers (agent-mesh.eth) are
   * already registered at startup, so we skip them here.
   */
  async refreshRegistry(): Promise<void> {
    const existingNames = new Set(this.toolRegistry.map((t) => t.ensName));

    // 1. On-chain AgentRegistry — discover third-party providers only
    try {
      const onChainAgents = await discoverToolsFromRegistry();
      for (const agent of onChainAgents) {
        // Skip our own sub-agents (legacy entries) and already-known providers
        if (agent.ensName.endsWith(".agent-mesh.eth")) continue;
        if (existingNames.has(agent.ensName)) continue;
        this.toolRegistry.push(agent);
        existingNames.add(agent.ensName);
        this.emit({ type: "tool_discovered", tool: agent });
      }
    } catch {
      // Non-critical — continue with ENS fallback
    }

    // 2. ENS resolution (enriches with text records like x402.price)
    try {
      const ensAgents = await discoverAgentsFromENS();
      for (const agent of ensAgents) {
        if (agent.ensName.endsWith(".agent-mesh.eth")) continue;
        if (existingNames.has(agent.ensName)) continue;
        this.toolRegistry.push(agent);
        existingNames.add(agent.ensName);
        this.emit({ type: "tool_discovered", tool: agent });
      }
    } catch {
      // Non-critical — ENS resolution is optional enrichment
    }

    // 3. Discover individual tools from external providers via tools/list
    // Skip our own provider (agent-mesh.eth) — already registered as built-in
    const externalProviders = this.toolRegistry.filter(
      (p) => p.ensName !== "agent-mesh.eth",
    );
    if (externalProviders.length > 0) {
      await this.toolCatalog.discoverFromProviders(externalProviders);
    }
  }

  /**
   * Subscribe to agent events (for dashboard SSE).
   */
  onEvent(listener: (event: AgentEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Set a callback for requesting user payment approval.
   * When set, tool calls will pause and ask the user to sign before paying.
   */
  setPaymentApproval(
    cb: PaymentApprovalCallback | undefined,
    payerAddress?: string,
  ): void {
    this.paymentApprovalCallback = cb;
    this.payerAddress = payerAddress;
  }

  private emit(event: AgentEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  /**
   * Process a user goal: plan subtasks, discover tools, execute, return result.
   */
  async processGoal(goal: string): Promise<Task> {
    const task: Task = {
      id: uuid(),
      goal,
      status: "in-progress",
      subtasks: [],
      createdAt: Date.now(),
    };

    this.emit({ type: "task_created", task });

    // Refresh tool registry from on-chain before processing
    await this.refreshRegistry();

    try {
      // Step 1: Plan subtasks using LLM
      const plan = await this.planTask(goal);
      task.subtasks = plan;

      // If no subtasks AND goal doesn't look like a tool request, respond conversationally
      // const looksLikeToolRequest =
      //   /price|yield|swap|trade|balance|risk|audit|protocol|tvl|token|deposit|stake|portfolio/i.test(goal);
      // if (task.subtasks.length === 0 && looksLikeToolRequest) {
      //   task.subtasks = this.planTaskFallback(goal);
      // }
      if (task.subtasks.length === 0) {
        let reply =
          "Hello! I'm AgentMesh — a DeFi agent orchestrator. I can help with DeFi research, risk analysis, yield scanning, protocol stats, and executing swaps. What would you like to do?";
        try {
          const response = await this.llm.chat.completions.create({
            model: ZERO_G.computeModel,
            messages: [
              {
                role: "system",
                content:
                  "You are AgentMesh, a DeFi agent orchestrator. Respond briefly and helpfully to the user. If they greet you, greet back and explain what you can do (DeFi research, risk analysis, swaps, yield scanning, etc.).",
              },
              { role: "user", content: goal },
            ],
            temperature: 0.7,
          });
          reply = response.choices[0]?.message?.content ?? reply;
        } catch {
          // LLM unavailable — use fallback greeting
        }
        task.status = "completed";
        task.completedAt = Date.now();
        this.emit({ type: "task_completed", taskId: task.id, result: reply });
        return task;
      }

      // Step 2: Execute each subtask
      for (const subtask of task.subtasks) {
        subtask.status = "in-progress";

        // Discover tool for this subtask
        // 1. Check ToolCatalog first (external providers discovered via tools/list)
        const catalogTool = this.toolCatalog.getTool(subtask.assignedTool);
        let tool: AgentIdentity;

        if (catalogTool && catalogTool.providerEndpoint) {
          // Found in catalog — resolve to provider
          const provider = this.toolRegistry.find(
            (t) => t.ensName === catalogTool.providerName,
          );
          tool = provider ?? {
            name: catalogTool.providerName,
            ensName: catalogTool.providerName,
            axlPeerKey: "",
            endpoint: catalogTool.providerEndpoint,
            capabilities: [catalogTool.name],
          };
        } else {
          // 2. Fallback: match by capability in registry
          const tools = await discoverToolsByCapability(
            subtask.assignedTool,
            this.toolRegistry,
          );

          if (tools.length === 0) {
            subtask.status = "failed";
            subtask.result = {
              error: `No tool found for: ${subtask.assignedTool}`,
            };
            continue;
          }
          tool = tools[0];
        }
        this.emit({
          type: "tool_called",
          tool: tool.ensName,
          toolName: subtask.assignedTool,
          method: subtask.description,
        });

        try {
          const result = await this.callTool(tool, subtask);
          subtask.status = "completed";
          subtask.result = result;

          // Record reputation on 0G Chain via KeeperHub (non-blocking)
          const responseTime = Date.now() - task.createdAt;
          const earned =
            (subtask.payment ? parseFloat(subtask.payment.amount) : 0) * 1e6; // USDC 6 decimals
          recordReputation(tool.ensName, true, responseTime, earned)
            .then((r) => {
              if (r.status !== "skipped") {
                console.log(
                  `   ⛓️ Reputation: ${tool.ensName} +1 success (${r.status})`,
                );
              }
            })
            .catch(() => {});
        } catch (error) {
          subtask.status = "failed";
          subtask.result = { error: String(error) };

          // Record failure reputation (non-blocking)
          recordReputation(
            tool.ensName,
            false,
            Date.now() - task.createdAt,
            0,
          ).catch(() => {});
        }
      }

      task.status = "completed";
      task.completedAt = Date.now();
      this.emit({ type: "task_completed", taskId: task.id, result: task });

      // Store conversation log to 0G Storage (non-blocking)
      storeConversationLog(
        task.id,
        task.goal,
        task.subtasks.map((s) => ({
          description: s.description,
          status: s.status,
          result: s.result,
        })),
      )
        .then((hash) => {
          console.log(
            `  📦 Conversation stored to 0G: ${hash.slice(0, 18)}...`,
          );
        })
        .catch(() => {
          // Non-critical — don't fail the task
        });
    } catch (error) {
      task.status = "failed";
      this.emit({ type: "error", message: String(error) });
    }

    return task;
  }

  /**
   * Use LLM to break a goal into subtasks. Falls back to keyword-based planning.
   */
  private async planTask(goal: string): Promise<SubTask[]> {
    // LLM-only planning (keyword fallback disabled for testing)
    return await this.planTaskWithLLM(goal);
  }

  private planTaskFallback(goal: string): SubTask[] {
    const g = goal.toLowerCase();
    const subtasks: SubTask[] = [];

    if (
      g.includes("yield") ||
      g.includes("scan") ||
      g.includes("find") ||
      g.includes("best")
    ) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Scan DeFi yields",
        assignedTool: "defi-research",
        status: "pending",
      });
    }
    if (g.includes("token") || g.includes("price") || g.includes("info")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Get token info",
        assignedTool: "defi-research",
        status: "pending",
      });
    }
    if (g.includes("protocol") || g.includes("stats") || g.includes("tvl")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Get protocol stats",
        assignedTool: "defi-research",
        status: "pending",
      });
    }
    if (g.includes("risk") || g.includes("safe") || g.includes("assess")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Assess risk",
        assignedTool: "risk-analysis",
        status: "pending",
      });
    }
    if (g.includes("audit") || g.includes("vulnerab")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Check contract audit",
        assignedTool: "risk-analysis",
        status: "pending",
      });
    }
    if (g.includes("swap") || g.includes("trade") || g.includes("exchange")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Execute swap",
        assignedTool: "execution",
        status: "pending",
      });
    }
    if (g.includes("deposit") || g.includes("stake")) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Execute deposit",
        assignedTool: "execution",
        status: "pending",
      });
    }
    if (
      g.includes("balance") ||
      g.includes("portfolio") ||
      g.includes("wallet")
    ) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: "Check balance",
        assignedTool: "execution",
        status: "pending",
      });
    }

    // If nothing matched, it's likely conversational — return empty
    return subtasks;
  }

  private async planTaskWithLLM(goal: string): Promise<SubTask[]> {
    const toolSummary = this.toolCatalog.getToolSummaryForPlanner();
    const systemPrompt = `You are a task planner for a DeFi agent mesh. Break the user's goal into subtasks.
Available tools:
${toolSummary}

RULES:
1. If the user asks about prices, tokens, protocols, yields, swaps, balances, risk, or ANY DeFi-related data — you MUST return a tool call. These are NOT conversational.
2. ONLY return an empty array [] for pure greetings ("hi", "hello", "thanks") or questions about yourself ("who are you", "what can you do").
3. "What's the price of X" → use token-info. "Show me yields" → use scan-yields. "How risky is X" → use risk-assess.

Respond with ONLY a JSON array, no markdown, no explanation: [{"description": "...", "tool": "exact-tool-name"}]
Use exact tool names from the list above. If unsure, use the closest match.`;

    const response = await this.llm.chat.completions.create({
      model: ZERO_G.computeModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: goal },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content ?? "[]";

    try {
      // Extract JSON array even if wrapped in markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr) as Array<{
        description: string;
        capability?: string;
        tool?: string;
      }>;
      return parsed.map((item) => ({
        id: uuid(),
        parentId: "",
        description: item.description ?? goal,
        assignedTool: item.tool ?? item.capability ?? "defi-research",
        status: "pending" as const,
      }));
    } catch {
      // Fallback: single subtask
      return [
        {
          id: uuid(),
          parentId: "",
          description: goal,
          assignedTool: "defi-research",
          status: "pending" as const,
        },
      ];
    }
  }

  /**
   * Call a tool provider via AXL MCP or local router.
   * Handles x402 payment flow: if 402 received, sign payment and retry.
   */
  private async callTool(
    tool: AgentIdentity,
    subtask: SubTask,
  ): Promise<unknown> {
    // Local mode: prefer local router for our own provider or any local tool
    if (this.config.localMode && this.localRouter) {
      const toolName = this.resolveToolName(subtask);
      const hasLocalTool = this.localRouter.listTools().includes(toolName);

      if (hasLocalTool || tool.ensName === "agent-mesh.eth") {
        // Create real x402 payment proof (EIP-712 signed)
        const price =
          TOOL_PRICES[toolName as keyof typeof TOOL_PRICES] ?? "0.01";

        // Request user approval if callback is set
        let paymentProof: string;
        if (this.paymentApprovalCallback) {
          const ethers = await import("ethers");
          const validAfter = Math.floor(Date.now() / 1000) - 60;
          const validBefore = Math.floor(Date.now() / 1000) + 3600;
          const nonce = ethers.hexlify(ethers.randomBytes(32));
          const value = ethers.parseUnits(price, 6);

          const eip712 = {
            domain: {
              name: "USD Coin",
              version: "2",
              chainId: 84532,
              verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            },
            types: {
              TransferWithAuthorization: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "validAfter", type: "uint256" },
                { name: "validBefore", type: "uint256" },
                { name: "nonce", type: "bytes32" },
              ],
            },
            message: {
              from:
                this.payerAddress ??
                this.config.walletAddress ??
                "0x0000000000000000000000000000000000000000",
              to:
                tool.endpoint && tool.endpoint.startsWith("0x")
                  ? tool.endpoint
                  : "0x000000000000000000000000000000000000dEaD",
              value: value.toString(),
              validAfter: validAfter.toString(),
              validBefore: validBefore.toString(),
              nonce,
            },
          };

          const approval = await this.paymentApprovalCallback({
            toolName,
            amount: price,
            recipient: tool.ensName,
            eip712,
          });

          if (!approval.approved) {
            throw new Error("Payment rejected by user");
          }

          // Build proof from user's signature
          const payload = {
            type: "x402-payment",
            version: "1.0",
            network: "base-sepolia",
            chainId: 84532,
            token: "USDC",
            tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            from:
              this.payerAddress ??
              this.config.walletAddress ??
              "0x0000000000000000000000000000000000000000",
            to: tool.ensName,
            value: value.toString(),
            validAfter,
            validBefore,
            nonce,
            signature: approval.signature,
            signed: true,
          };
          paymentProof = Buffer.from(JSON.stringify(payload)).toString(
            "base64",
          );
        } else {
          // No user callback — auto-sign server-side (legacy/API mode)
          paymentProof = await createPaymentProof(
            this.payerAddress ??
              this.config.walletAddress ??
              "0x0000000000000000000000000000000000000000",
            tool.ensName,
            price,
          );
        }

        // Derive txHash from the signed proof
        const proofData = JSON.parse(
          Buffer.from(paymentProof, "base64").toString(),
        );
        const txHash = proofData.signature
          ? proofData.signature.slice(0, 66)
          : `0x${Buffer.from(paymentProof.slice(0, 32)).toString("hex").padEnd(64, "0")}`;

        const payment: PaymentRecord = {
          txHash,
          amount: price,
          from:
            proofData.from ??
            this.payerAddress ??
            this.config.walletAddress ??
            "0x0000000000000000000000000000000000000000",
          to: tool.ensName,
          timestamp: Date.now(),
        };
        this.emit({ type: "payment_sent", payment });
        subtask.payment = payment;

        const response = await this.localRouter.call(toolName, {
          task: subtask.description,
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.result;
      }
    }

    // External HTTP endpoint: call tool via its registered URL
    // Uses x402 flow: attempt call → if 402 → pay → retry
    if (tool.endpoint && tool.endpoint.startsWith("http")) {
      // Resolve the specific tool name from the catalog
      const catalogTool = this.toolCatalog.getTool(subtask.assignedTool);
      const endpoint = catalogTool?.providerEndpoint ?? tool.endpoint;
      const toolName = catalogTool?.name ?? subtask.assignedTool;

      // First attempt: call without payment (server may return 402)
      const firstResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: {
            name: toolName,
            arguments: { task: subtask.description },
          },
        }),
      });

      // x402 flow: server demands payment
      if (firstResponse.status === 402) {
        const paymentRequired = (await firstResponse.json()) as {
          amount?: string;
          token?: string;
          address?: string;
        };
        const amount = paymentRequired.amount ?? "0.01";
        const payTo = paymentRequired.address ?? tool.ensName;

        console.log(`💰 Payment required: ${amount} USDC to ${payTo}`);

        // Pay-with-any-token: auto-swap if needed
        const swapResult = await payWithAnyToken("ETH", amount);
        if (swapResult.swapExecuted) {
          this.emit({
            type: "tool_called",
            tool: "pay-with-any-token",
            method: `💱 ${swapResult.amountIn} ${swapResult.sourceToken} → ${swapResult.amountOut} USDC via ${swapResult.swapRoute}`,
          });
        }

        const paymentProof = await createPaymentProof(
          this.payerAddress ??
            this.config.walletAddress ??
            "0x0000000000000000000000000000000000000000",
          payTo,
          amount,
        );

        const proofData = JSON.parse(
          Buffer.from(paymentProof, "base64").toString(),
        );
        const txHash = proofData.signature
          ? proofData.signature.slice(0, 66)
          : `0x${Buffer.from(paymentProof.slice(0, 32)).toString("hex").padEnd(64, "0")}`;

        const payment: PaymentRecord = {
          txHash,
          amount,
          from:
            proofData.from ??
            this.payerAddress ??
            this.config.walletAddress ??
            "0x0000000000000000000000000000000000000000",
          to: payTo,
          timestamp: Date.now(),
        };
        this.emit({ type: "payment_sent", payment });
        subtask.payment = payment;

        // Retry with payment header
        const retryResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Payment": paymentProof,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            id: 1,
            params: {
              name: toolName,
              arguments: { task: subtask.description },
            },
          }),
        });

        if (!retryResponse.ok) {
          throw new Error(`Payment retry failed: ${retryResponse.status}`);
        }

        const retryData = (await retryResponse.json()) as {
          result?: unknown;
          error?: { message: string };
        };
        if (retryData.error) throw new Error(retryData.error.message);
        return retryData.result;
      }

      // No 402 — tool responded directly
      if (!firstResponse.ok) {
        throw new Error(
          `External tool returned ${firstResponse.status}: ${firstResponse.statusText}`,
        );
      }

      const data = (await firstResponse.json()) as {
        result?: unknown;
        error?: { message: string };
      };
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.result;
    }

    // AXL mode: call via P2P mesh
    try {
      const response = await callMCPService(
        this.config.axlPort,
        tool.axlPeerKey,
        tool.capabilities[0],
        subtask.description,
        { task: subtask.description },
      );
      return response.result;
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        // x402 flow: sign payment and retry
        console.log(
          `💰 Payment required: ${error.amount} USDC to ${error.paymentAddress}`,
        );

        // Pay-with-any-token: auto-swap ETH → USDC if needed via Uniswap
        const swapResult = await payWithAnyToken("ETH", error.amount);
        if (swapResult.swapExecuted) {
          this.emit({
            type: "tool_called",
            tool: "pay-with-any-token",
            method: `💱 ${swapResult.amountIn} ${swapResult.sourceToken} → ${swapResult.amountOut} USDC via ${swapResult.swapRoute}`,
          });
        }

        const paymentProof = await createPaymentProof(
          this.payerAddress ??
            this.config.walletAddress ??
            "0x0000000000000000000000000000000000000000",
          error.paymentAddress,
          error.amount,
        );

        // Derive txHash from the signed proof (deterministic, verifiable)
        const proofData = JSON.parse(
          Buffer.from(paymentProof, "base64").toString(),
        );
        const txHash = proofData.signature
          ? proofData.signature.slice(0, 66) // Use first 32 bytes of signature as txHash
          : `0x${Buffer.from(paymentProof.slice(0, 32)).toString("hex").padEnd(64, "0")}`;

        const payment: PaymentRecord = {
          txHash,
          amount: error.amount,
          from:
            proofData.from ??
            this.payerAddress ??
            this.config.walletAddress ??
            "0x0000000000000000000000000000000000000000",
          to: error.paymentAddress,
          timestamp: Date.now(),
        };
        this.emit({ type: "payment_sent", payment });
        subtask.payment = payment;

        // Retry with payment header
        const url = `http://127.0.0.1:${this.config.axlPort}/mcp/${tool.axlPeerKey}/${tool.capabilities[0]}`;
        const retryResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Payment": paymentProof,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            id: 1,
            params: {
              name: subtask.description,
              arguments: { task: subtask.description },
            },
          }),
        });

        if (!retryResponse.ok) {
          throw new Error(`Payment retry failed: ${retryResponse.status}`);
        }

        const result = await retryResponse.json();
        return (result as { result?: unknown }).result;
      }
      throw error;
    }
  }

  /**
   * Map a subtask to the best tool name.
   */
  private resolveToolName(subtask: SubTask): string {
    const desc = (subtask.description ?? "").toLowerCase();
    const cap = (subtask.assignedTool ?? "").toLowerCase();

    // Keyword matching from description
    if (
      desc.includes("yield") ||
      desc.includes("scan") ||
      desc.includes("defi")
    )
      return "scan-yields";
    if (desc.includes("token") || desc.includes("price")) return "token-info";
    if (
      desc.includes("protocol") ||
      desc.includes("stats") ||
      desc.includes("compare") ||
      desc.includes("research")
    )
      return "protocol-stats";
    if (desc.includes("risk") || desc.includes("assess")) return "risk-assess";
    if (desc.includes("audit") || desc.includes("vulnerab"))
      return "contract-audit";
    if (desc.includes("swap") || desc.includes("trade")) return "execute-swap";
    if (desc.includes("deposit") || desc.includes("stake"))
      return "execute-deposit";
    if (desc.includes("balance") || desc.includes("portfolio"))
      return "check-balance";

    // Fallback: map capability category to a default tool
    if (cap.includes("research")) return "protocol-stats";
    if (cap.includes("risk")) return "risk-assess";
    if (cap.includes("execution") || cap.includes("exec"))
      return "check-balance";
    return subtask.assignedTool;
  }
}
