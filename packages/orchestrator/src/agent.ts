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

export interface OrchestratorConfig {
  axlPort: number;
  zgServiceUrl: string;
  zgApiSecret: string;
}

export class OrchestratorAgent {
  private llm: OpenAI;
  private config: OrchestratorConfig;
  private toolRegistry: AgentIdentity[] = [];
  private eventListeners: ((event: AgentEvent) => void)[] = [];

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.llm = new OpenAI({
      baseURL: `${config.zgServiceUrl}/v1/proxy`,
      apiKey: config.zgApiSecret,
    });
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
          subtask.result = { error: `No tool found for: ${subtask.assignedTool}` };
          continue;
        }

        const tool = tools[0];
        this.emit({ type: "tool_called", tool: tool.ensName, method: subtask.description });

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
   * Use LLM to break a goal into subtasks.
   */
  private async planTask(goal: string): Promise<SubTask[]> {
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
   * Call a tool provider via AXL MCP.
   */
  private async callTool(
    tool: AgentIdentity,
    subtask: SubTask,
  ): Promise<unknown> {
    try {
      const response = await callMCPService(
        this.config.axlPort,
        tool.axlPeerKey,
        tool.capabilities[0], // primary service name
        subtask.description,
        { task: subtask.description },
      );
      return response.result;
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        // TODO: Handle x402 payment flow
        // 1. Sign payment with x402 SDK
        // 2. Retry request with payment header
        console.log(`💰 Payment required: ${error.amount} USDC to ${error.paymentAddress}`);
        throw error;
      }
      throw error;
    }
  }
}
