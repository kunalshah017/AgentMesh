// On-chain AgentRegistry reader — queries 0G Chain for registered tool providers

import { ethers } from "ethers";
import { ZERO_G } from "./constants.js";
import type { AgentIdentity } from "./types.js";

const AGENT_REGISTRY_ADDRESS = "0x0B05236c972DbFCe91519a183980F0D5fFd9da28";

// ABI for the AgentRegistry contract (read functions only)
const REGISTRY_ABI = [
  "function getAgentCount() view returns (uint256)",
  "function getAllAgentIds() view returns (bytes32[])",
  "function getAgent(bytes32 id) view returns (address owner, string ensName, string axlPeerKey, string[] capabilities, uint256 pricePerCall, uint256 registeredAt, bool active)",
];

/**
 * Query the on-chain AgentRegistry to discover all registered tool providers.
 * Decodes real on-chain data — no hardcoded fallback.
 */
export async function discoverToolsFromRegistry(): Promise<AgentIdentity[]> {
  try {
    const provider = new ethers.JsonRpcProvider(ZERO_G.chainRpc);
    const registry = new ethers.Contract(
      AGENT_REGISTRY_ADDRESS,
      REGISTRY_ABI,
      provider,
    );

    // Get all agent IDs from on-chain
    const agentIds: string[] = await registry.getAllAgentIds();
    if (agentIds.length === 0) return [];

    // Fetch each agent's full data
    const agents: AgentIdentity[] = [];
    for (const id of agentIds) {
      try {
        const [, ensName, axlPeerKey, capabilities, pricePerCall, , active] =
          await registry.getAgent(id);

        if (!active) continue; // Skip deactivated agents

        // Extract name from ENS (e.g., "researcher.agentmesh.eth" → "Researcher")
        const name = ensName.split(".")[0];
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

        agents.push({
          name: formattedName,
          ensName,
          axlPeerKey: axlPeerKey.startsWith("http") ? "" : axlPeerKey,
          endpoint: axlPeerKey.startsWith("http") ? axlPeerKey : undefined,
          capabilities: [...capabilities],
        });
      } catch (err) {
        console.log(`   ⚠️ Failed to decode agent ${id}: ${err}`);
      }
    }

    console.log(
      `   ⛓️ AgentRegistry: ${agents.length} active agents discovered on 0G Chain`,
    );
    return agents;
  } catch (error) {
    console.log(`   ⚠️ On-chain registry unavailable: ${error}`);
    return [];
  }
}
