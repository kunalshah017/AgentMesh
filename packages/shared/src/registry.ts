// On-chain AgentRegistry reader — queries 0G Chain for registered MCP providers

import { ethers } from "ethers";
import { ZERO_G } from "./constants.js";
import type { AgentIdentity } from "./types.js";

const AGENT_REGISTRY_ADDRESS = "0x632B1282B766fb811b3570274A86A4E83838cbDd";

// ABI for the AgentRegistry v2 contract (read functions only)
const REGISTRY_ABI = [
  "function getAgentCount() view returns (uint256)",
  "function getAllAgentIds() view returns (bytes32[])",
  "function getAgent(bytes32 id) view returns (address owner, string ensName, string endpoint, string[] categories, uint256 registeredAt, bool active)",
];

/**
 * Query the on-chain AgentRegistry to discover all registered MCP providers.
 * Returns AgentIdentity[] with endpoint URL and categories.
 */
export async function discoverToolsFromRegistry(): Promise<AgentIdentity[]> {
  try {
    const provider = new ethers.JsonRpcProvider(ZERO_G.chainRpc);
    const registry = new ethers.Contract(
      AGENT_REGISTRY_ADDRESS,
      REGISTRY_ABI,
      provider,
    );

    // Get all provider IDs from on-chain
    const agentIds: string[] = await registry.getAllAgentIds();
    if (agentIds.length === 0) return [];

    // Fetch each provider's full data
    const agents: AgentIdentity[] = [];
    for (const id of agentIds) {
      try {
        const [, ensName, endpoint, categories, , active] =
          await registry.getAgent(id);

        if (!active) continue; // Skip deactivated providers

        // Extract name from ENS (e.g., "researcher.agent-mesh.eth" → "Researcher")
        const name = ensName.split(".")[0];
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

        agents.push({
          name: formattedName,
          ensName,
          axlPeerKey: "", // Legacy field — not used in v2
          endpoint: endpoint || undefined,
          capabilities: [...categories],
        });
      } catch (err) {
        console.log(`   ⚠️ Failed to decode provider ${id}: ${err}`);
      }
    }

    console.log(
      `   ⛓️ AgentRegistry: ${agents.length} active providers discovered on 0G Chain`,
    );
    return agents;
  } catch (error) {
    console.log(`   ⚠️ On-chain registry unavailable: ${error}`);
    return [];
  }
}
