import { ethers } from "hardhat";

const AGENTS = [
  {
    ensName: "orchestrator.agentmesh.eth",
    axlPeerKey: "orchestrator-key-placeholder",
    capabilities: ["task-planning", "tool-discovery", "orchestration"],
    pricePerCall: ethers.parseUnits("0", 6), // Orchestrator doesn't charge
  },
  {
    ensName: "researcher.agentmesh.eth",
    axlPeerKey: "researcher-key-placeholder",
    capabilities: [
      "defi-research",
      "scan-yields",
      "token-info",
      "protocol-stats",
    ],
    pricePerCall: ethers.parseUnits("0.01", 6),
  },
  {
    ensName: "analyst.agentmesh.eth",
    axlPeerKey: "risk-analyst-key-placeholder",
    capabilities: ["risk-analysis", "risk-assess", "contract-audit"],
    pricePerCall: ethers.parseUnits("0.03", 6),
  },
  {
    ensName: "executor.agentmesh.eth",
    axlPeerKey: "executor-key-placeholder",
    capabilities: [
      "execution",
      "execute-swap",
      "execute-deposit",
      "check-balance",
    ],
    pricePerCall: ethers.parseUnits("0.05", 6),
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n",
  );

  // Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AgentRegistry deployed to:", registryAddress);

  // Deploy ReputationTracker
  const ReputationTracker =
    await ethers.getContractFactory("ReputationTracker");
  const reputation = await ReputationTracker.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("ReputationTracker deployed to:", reputationAddress);

  // Register all agents on-chain
  console.log("\n--- Registering Agents ---");
  for (const agent of AGENTS) {
    const tx = await registry.registerAgent(
      agent.ensName,
      agent.axlPeerKey,
      agent.capabilities,
      agent.pricePerCall,
    );
    await tx.wait();
    // Match Solidity: keccak256(abi.encodePacked(ensName))
    const id = ethers.solidityPackedKeccak256(["string"], [agent.ensName]);
    console.log(`  ✅ ${agent.ensName} → ${id.slice(0, 18)}...`);
  }

  const agentCount = await registry.getAgentCount();
  console.log(`\n  Total agents registered: ${agentCount}`);

  console.log("\n--- Deployment Summary ---");
  console.log(
    `Network:           ${(await ethers.provider.getNetwork()).name}`,
  );
  console.log(`AgentRegistry:     ${registryAddress}`);
  console.log(`ReputationTracker: ${reputationAddress}`);
  console.log(`\nAdd these to your .env:`);
  console.log(`AGENT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`REPUTATION_TRACKER_ADDRESS=${reputationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
