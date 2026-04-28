// AXL P2P Communication Utilities

import type { MCPRequest, MCPResponse } from "./types.js";

/**
 * Build the URL for calling an MCP service on a remote AXL peer.
 */
export function buildMCPUrl(
  localPort: number,
  peerKey: string,
  serviceName: string,
): string {
  return `http://127.0.0.1:${localPort}/mcp/${peerKey}/${serviceName}`;
}

/**
 * Create an MCP JSON-RPC request payload.
 */
export function createMCPRequest(
  method: string,
  params: Record<string, unknown>,
  id: number | string = 1,
): MCPRequest {
  return {
    jsonrpc: "2.0",
    method,
    id,
    params,
  };
}

/**
 * Call a remote MCP service via AXL.
 */
export async function callMCPService(
  localPort: number,
  peerKey: string,
  serviceName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<MCPResponse> {
  const url = buildMCPUrl(localPort, peerKey, serviceName);
  const payload = createMCPRequest("tools/call", {
    name: toolName,
    arguments: args,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 402) {
    // Payment required — handle x402 flow
    throw new PaymentRequiredError(
      response.headers.get("X-Payment-Address") ?? "",
      response.headers.get("X-Payment-Amount") ?? "0",
    );
  }

  if (!response.ok) {
    throw new Error(`MCP call failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<MCPResponse>;
}

export class PaymentRequiredError extends Error {
  constructor(
    public readonly paymentAddress: string,
    public readonly amount: string,
  ) {
    super(`Payment required: ${amount} USDC to ${paymentAddress}`);
    this.name = "PaymentRequiredError";
  }
}
