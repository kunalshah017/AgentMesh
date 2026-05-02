import { ethers } from "hardhat";

// AgentMesh is ONE provider — the orchestrator exposes all tools.
// Internal agents (researcher, analyst, executor, gas-optimizer) are behind the scenes.
// The registry is for external providers to register their MCP servers.
const AGENTMESH_PROVIDER = {
  ensName: "agent-mesh.eth",
  endpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
  categories: [
    "defi-research",
    "yield-scanning",
    "token-analysis",
    "risk-analysis",
    "contract-auditing",
    "execution",
    "token-swaps",
    "gas-prediction",
  ],
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n",
  );

  // Deploy AgentRegistry (v2)
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AgentRegistry (v2) deployed to:", registryAddress);

  // Deploy ReputationTracker
  const ReputationTracker =
    await ethers.getContractFactory("ReputationTracker");
  const reputation = await ReputationTracker.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("ReputationTracker deployed to:", reputationAddress);

  // Register AgentMesh as the first provider on-chain
  console.log("\n--- Registering AgentMesh Provider ---");
  const tx = await registry.registerAgent(
    AGENTMESH_PROVIDER.ensName,
    AGENTMESH_PROVIDER.endpoint,
    AGENTMESH_PROVIDER.categories,
  );
  await tx.wait();
  const id = ethers.solidityPackedKeccak256(
    ["string"],
    [AGENTMESH_PROVIDER.ensName],
  );
  console.log(`  ✅ ${AGENTMESH_PROVIDER.ensName} → ${id.slice(0, 18)}...`);

  const count = await registry.getAgentCount();
  console.log(`\n  Total providers registered: ${count}`);

  console.log("\n--- Deployment Summary ---");
  console.log(`AgentRegistry:     ${registryAddress}`);
  console.log(`ReputationTracker: ${reputationAddress}`);
  console.log("\nUpdate these addresses in:");
  console.log("  - client/src/config/contracts.ts");
  console.log("  - packages/shared/src/registry.ts");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
