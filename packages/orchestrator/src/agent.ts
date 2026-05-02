// Orchestrator Agent - Core Logic

import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import {
  type Task,
  type SubTask,
  type AgentIdentity,
  type AgentEvent,
  type PaymentRecord,
  callMCPService,
  PaymentRequiredError,
  discoverToolsByCapability,
  createPaymentProof,
  storeConversationLog,
  recordReputation,
  ZERO_G,
  TOOL_PRICES,
} from "@agentmesh/shared";
import { payWithAnyToken } from "@agentmesh/executor/tools";
import { LocalToolRouter } from "./local-router.js";

export interface OrchestratorConfig {
  axlPort: number;
  zgServiceUrl: string;
  zgApiSecret: string;
  localMode?: boolean; // Skip AXL, call tools directly
  walletAddress?: string; // Orchestrator's wallet for x402 payments
}

export class OrchestratorAgent {
  private llm: OpenAI;
  private config: OrchestratorConfig;
  private toolRegistry: AgentIdentity[] = [];
  private eventListeners: ((event: AgentEvent) => void)[] = [];
  private localRouter?: LocalToolRouter;

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
   * Register a known tool provider (populated from ENS or local config).
   */
  registerTool(tool: AgentIdentity): void {
    this.toolRegistry.push(tool);
    this.emit({ type: "tool_discovered", tool });
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

    try {
      // Step 1: Plan subtasks using LLM
      const plan = await this.planTask(goal);
      task.subtasks = plan;

      // Step 2: Execute each subtask
      for (const subtask of task.subtasks) {
        subtask.status = "in-progress";

        // Discover tool for this subtask
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

        const tool = tools[0];
        this.emit({
          type: "tool_called",
          tool: tool.ensName,
          method: subtask.description,
        });

        try {
          const result = await this.callTool(tool, subtask);
          subtask.status = "completed";
          subtask.result = result;

          // Record reputation on 0G Chain via KeeperHub (non-blocking)
          const responseTime = Date.now() - task.createdAt;
          const earned = parseFloat(tool.pricePerCall ?? "0.01") * 1e6; // USDC 6 decimals
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
    // Try LLM-based planning first
    try {
      return await this.planTaskWithLLM(goal);
    } catch {
      // Fallback: keyword-based planning
      return this.planTaskFallback(goal);
    }
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

    // Default if nothing matched
    if (subtasks.length === 0) {
      subtasks.push({
        id: uuid(),
        parentId: "",
        description: goal,
        assignedTool: "defi-research",
        status: "pending",
      });
    }

    return subtasks;
  }

  private async planTaskWithLLM(goal: string): Promise<SubTask[]> {
    const systemPrompt = `You are a task planner for a DeFi agent mesh. Break the user's goal into subtasks.
Available tool capabilities: defi-research, risk-analysis, execution.
Respond with ONLY a JSON array, no markdown, no explanation: [{"description": "...", "capability": "..."}]`;

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
        capability: string;
      }>;
      return parsed.map((item) => ({
        id: uuid(),
        parentId: "",
        description: item.description,
        assignedTool: item.capability,
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
    // Local mode: call tool directly without AXL
    if (this.config.localMode && this.localRouter) {
      const toolName = this.resolveToolName(subtask);

      // Simulate x402 payment for demo visibility
      const price = TOOL_PRICES[toolName as keyof typeof TOOL_PRICES] ?? "0.01";
      const payment: PaymentRecord = {
        txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
        amount: price,
        from: this.config.walletAddress ?? "0xOrchestrator",
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
          this.config.walletAddress ?? "0xOrchestrator",
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
          from: proofData.from ?? this.config.walletAddress ?? "0xOrchestrator",
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
    const desc = subtask.description.toLowerCase();
    const cap = subtask.assignedTool.toLowerCase();

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
