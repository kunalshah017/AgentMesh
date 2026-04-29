// Register agents on-chain to AgentRegistry (0G Chain Testnet)
// Usage: bun run scripts/register-agents.ts

import { ethers } from "hardhat";

const AGENT_REGISTRY = "0x0B05236c972DbFCe91519a183980F0D5fFd9da28";

const AGENTS = [
  {
    ensName: "researcher.agentmesh.eth",
    axlPeerKey:
      "85bae0a7eff775247fba487d780dadc9c988ca191bc3d1304b3c5e64471766b6",
    capabilities: [
      "defi-research",
      "scan-yields",
      "token-info",
      "protocol-stats",
    ],
    pricePerCall: 10000, // 0.01 USDC (6 decimals)
  },
  {
    ensName: "analyst.agentmesh.eth",
    axlPeerKey:
      "f2d4eea2662c03e11ce94ae55a709fef9e24c69a80d076ba778dbad83c815372",
    capabilities: [
      "risk-analysis",
      "risk-assess",
      "contract-audit",
      "portfolio-risk",
    ],
    pricePerCall: 30000, // 0.03 USDC
  },
  {
    ensName: "executor.agentmesh.eth",
    axlPeerKey:
      "60bb86f0c1180c125757f4b017fd1308e12c00f8373e695411630c3c244a271d",
    capabilities: [
      "execution",
      "execute-swap",
      "execute-deposit",
      "check-balance",
    ],
    pricePerCall: 50000, // 0.05 USDC
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Registering agents from:", deployer.address);

  const registry = await ethers.getContractAt("AgentRegistry", AGENT_REGISTRY);

  for (const agent of AGENTS) {
    try {
      const tx = await registry.registerAgent(
        agent.ensName,
        agent.axlPeerKey,
        agent.capabilities,
        agent.pricePerCall,
      );
      const receipt = await tx.wait();
      console.log(`✅ Registered ${agent.ensName} — tx: ${receipt!.hash}`);
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        console.log(`⏭️  ${agent.ensName} already registered`);
      } else {
        console.error(`❌ Failed to register ${agent.ensName}:`, error.message);
      }
    }
  }

  // Verify
  const count = await registry.getAgentCount();
  console.log(`\n📋 Total agents registered: ${count}`);
}

main().catch(console.error);
