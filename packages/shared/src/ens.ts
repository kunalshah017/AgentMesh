// ENS Resolution Utilities

import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { sepolia } from "viem/chains";
import type { AgentIdentity } from "./types.js";

/**
 * Create a viem client for ENS resolution on Sepolia.
 */
function getEnsClient(rpcUrl?: string) {
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl ?? "https://rpc.sepolia.org"),
  });
}

/**
 * Resolve an agent's identity from ENS text records.
 * Reads: axl-key, capabilities, price-per-task
 */
export async function resolveAgentFromENS(
  ensName: string,
  rpcUrl?: string,
): Promise<AgentIdentity> {
  const client = getEnsClient(rpcUrl);
  const normalized = normalize(ensName);

  const [axlKey, capabilities, price, name] = await Promise.all([
    client.getEnsText({ name: normalized, key: "axl-key" }).catch(() => null),
    client
      .getEnsText({ name: normalized, key: "capabilities" })
      .catch(() => null),
    client
      .getEnsText({ name: normalized, key: "price-per-task" })
      .catch(() => null),
    client.getEnsText({ name: normalized, key: "name" }).catch(() => null),
  ]);

  if (!axlKey) {
    throw new Error(`ENS text record 'axl-key' not found for ${ensName}`);
  }

  return {
    name: name ?? ensName.split(".")[0],
    ensName,
    axlPeerKey: axlKey,
    capabilities: capabilities
      ? capabilities.split(",").map((s) => s.trim())
      : [],
    pricePerCall: price ?? "0.01",
  };
}

/**
 * Resolve an ENS name to an Ethereum address.
 */
export async function resolveEnsAddress(
  ensName: string,
  rpcUrl?: string,
): Promise<string | null> {
  const client = getEnsClient(rpcUrl);
  const address = await client
    .getEnsAddress({ name: normalize(ensName) })
    .catch(() => null);
  return address;
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

/**
 * Try to discover agents from ENS, fall back to local registry.
 */
export async function discoverAgentsFromENS(
  subnames: string[],
  rpcUrl?: string,
): Promise<AgentIdentity[]> {
  const agents: AgentIdentity[] = [];
  for (const name of subnames) {
    try {
      const agent = await resolveAgentFromENS(name, rpcUrl);
      agents.push(agent);
    } catch {
      // Skip agents whose ENS records aren't set up yet
    }
  }
  return agents;
}
