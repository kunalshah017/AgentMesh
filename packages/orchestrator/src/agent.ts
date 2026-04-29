// Orchestrator Agent - Core Logic

import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import {
  type Task,
  type SubTask,
  type AgentIdentity,
  type AgentEvent,
  callMCPService,
  PaymentRequiredError,
  discoverToolsByCapability,
  ZERO_G,
} from "@agentmesh/shared";
import { LocalToolRouter } from "./local-router.js";

export interface OrchestratorConfig {
  axlPort: number;
  zgServiceUrl: string;
  zgApiSecret: string;
  localMode?: boolean; // Skip AXL, call tools directly
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
        } catch (error) {
          subtask.status = "failed";
          subtask.result = { error: String(error) };
        }
      }

      task.status = "completed";
      task.completedAt = Date.now();
      this.emit({ type: "task_completed", taskId: task.id, result: task });
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
Respond with a JSON array of subtasks: [{ "description": "...", "capability": "..." }]`;

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
      const parsed = JSON.parse(content) as Array<{
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
   */
  private async callTool(
    tool: AgentIdentity,
    subtask: SubTask,
  ): Promise<unknown> {
    // Local mode: call tool directly without AXL
    if (this.config.localMode && this.localRouter) {
      const toolName = this.resolveToolName(subtask);
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
        console.log(
          `💰 Payment required: ${error.amount} USDC to ${error.paymentAddress}`,
        );
        throw error;
      }
      throw error;
    }
  }

  /**
   * Map a subtask to the best tool name.
   */
  private resolveToolName(subtask: SubTask): string {
    const desc = subtask.description.toLowerCase();
    if (
      desc.includes("yield") ||
      desc.includes("scan") ||
      desc.includes("defi")
    )
      return "scan-yields";
    if (desc.includes("token") || desc.includes("price")) return "token-info";
    if (desc.includes("protocol") || desc.includes("stats"))
      return "protocol-stats";
    if (desc.includes("risk") || desc.includes("assess")) return "risk-assess";
    if (desc.includes("audit") || desc.includes("contract"))
      return "contract-audit";
    if (desc.includes("swap") || desc.includes("trade")) return "execute-swap";
    if (desc.includes("deposit") || desc.includes("stake"))
      return "execute-deposit";
    if (desc.includes("balance") || desc.includes("portfolio"))
      return "check-balance";
    return subtask.assignedTool;
  }
}
