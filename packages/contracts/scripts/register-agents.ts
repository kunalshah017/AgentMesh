// Register MCP providers on-chain to AgentRegistry v2 (0G Chain Testnet)
// Usage: npx hardhat run scripts/register-agents.ts --network zgTestnet

import { ethers } from "hardhat";

// Will be updated after deployment
const AGENT_REGISTRY = "0x0B05236c972DbFCe91519a183980F0D5fFd9da28";

const PROVIDERS = [
  {
    ensName: "researcher.agent-mesh.eth",
    endpoint: "", // Set when provider has a live MCP server
    categories: ["defi-research", "yield-scanning", "token-analysis"],
  },
  {
    ensName: "analyst.agent-mesh.eth",
    endpoint: "",
    categories: ["risk-analysis", "contract-auditing", "portfolio-risk"],
  },
  {
    ensName: "executor.agent-mesh.eth",
    endpoint: "",
    categories: ["execution", "token-swaps", "defi-deposits"],
  },
  {
    ensName: "gas-optimizer.agent-mesh.eth",
    endpoint: "",
    categories: ["gas-prediction", "fee-estimation"],
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Registering providers from:", deployer.address);

  const registry = await ethers.getContractAt("AgentRegistry", AGENT_REGISTRY);

  for (const provider of PROVIDERS) {
    try {
      const tx = await registry.registerAgent(
        provider.ensName,
        provider.endpoint,
        provider.categories,
      );
      const receipt = await tx.wait();
      console.log(`✅ Registered ${provider.ensName} — tx: ${receipt!.hash}`);
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        console.log(`⏭️  ${provider.ensName} already registered`);
      } else {
        console.error(`❌ Failed to register ${provider.ensName}:`, error.message);
      }
    }
  }

  // Verify
  const count = await registry.getAgentCount();
  console.log(`\n📋 Total providers registered: ${count}`);
}

main().catch(console.error);
