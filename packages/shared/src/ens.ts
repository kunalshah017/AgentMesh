// ENS Resolution Utilities

import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { sepolia } from "viem/chains";
import type { AgentIdentity } from "./types.js";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const PARENT_DOMAIN = "agent-mesh.eth";

/**
 * Create a viem client for ENS resolution on Sepolia.
 */
function getEnsClient(rpcUrl?: string) {
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl ?? SEPOLIA_RPC),
  });
}

/**
 * Resolve an agent's identity from ENS text records.
 * Reads: description, x402.price, url
 */
export async function resolveAgentFromENS(
  ensName: string,
  rpcUrl?: string,
): Promise<AgentIdentity> {
  const client = getEnsClient(rpcUrl);
  const normalized = normalize(ensName);

  const [description, price] = await Promise.all([
    client
      .getEnsText({ name: normalized, key: "description" })
      .catch(() => null),
    client
      .getEnsText({ name: normalized, key: "x402.price" })
      .catch(() => null),
  ]);

  const name = ensName.split(".")[0];

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ensName,
    axlPeerKey: `${name}-node-key`,
    capabilities: description ? [description] : [],
    pricePerCall: price?.replace(" USDC", "") ?? "0.01",
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
 * In production, this queries ENS subnames under agent-mesh.eth.
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
 * Discover agents from ENS subnames under agent-mesh.eth.
 * Falls back gracefully if ENS resolution fails.
 */
export async function discoverAgentsFromENS(
  subnames?: string[],
  rpcUrl?: string,
): Promise<AgentIdentity[]> {
  const names = subnames ?? [
    `researcher.${PARENT_DOMAIN}`,
    `executor.${PARENT_DOMAIN}`,
    `analyst.${PARENT_DOMAIN}`,
    `gas-optimizer.${PARENT_DOMAIN}`,
  ];
  const agents: AgentIdentity[] = [];
  for (const name of names) {
    try {
      const agent = await resolveAgentFromENS(name, rpcUrl);
      agents.push(agent);
    } catch {
      // Skip agents whose ENS records aren't set up yet
    }
  }
  return agents;
}
