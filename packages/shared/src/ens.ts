// ENS Resolution Utilities

import type { AgentIdentity } from "./types.js";

/**
 * Resolve an agent's identity from ENS text records.
 */
export async function resolveAgentFromENS(
  ensName: string,
  rpcUrl: string,
): Promise<AgentIdentity> {
  // TODO: Implement with viem's ENS support
  // const { createPublicClient, http } = await import("viem");
  // const { sepolia } = await import("viem/chains");
  // const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  // const axlKey = await client.getEnsText({ name: ensName, key: "axl-key" });
  // const capabilities = await client.getEnsText({ name: ensName, key: "capabilities" });
  // const price = await client.getEnsText({ name: ensName, key: "price-per-task" });
  throw new Error("Not implemented — requires ENS subname setup on Sepolia");
}

/**
 * Discover tools by capability via ENS.
 * In production, this queries ENS subnames under agentmesh.eth.
 * For hackathon, we use a local registry as fallback.
 */
export async function discoverToolsByCapability(
  capability: string,
  registry: AgentIdentity[],
): Promise<AgentIdentity[]> {
  return registry.filter((agent) =>
    agent.capabilities.some((cap) =>
      cap.toLowerCase().includes(capability.toLowerCase()),
    ),
  );
}
