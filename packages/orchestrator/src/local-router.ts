// Local Tool Router — Calls tool providers directly (no AXL needed)
// Used for development and demo mode

import type { MCPRequest, MCPResponse } from "@agentmesh/shared";

export type ToolHandler = (args: Record<string, string>) => Promise<unknown>;

export class LocalToolRouter {
  private tools = new Map<string, ToolHandler>();

  register(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  async call(
    toolName: string,
    args: Record<string, string>,
  ): Promise<MCPResponse> {
    const handler = this.tools.get(toolName);
    if (!handler) {
      return {
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      };
    }

    try {
      const result = await handler(args);
      return { jsonrpc: "2.0", id: 1, result };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32000, message: String(error) },
      };
    }
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
