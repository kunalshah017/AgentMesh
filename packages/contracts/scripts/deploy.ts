import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AgentRegistry deployed to:", registryAddress);

  // Deploy ReputationTracker
  const ReputationTracker = await ethers.getContractFactory("ReputationTracker");
  const reputation = await ReputationTracker.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("ReputationTracker deployed to:", reputationAddress);

  console.log("\n--- Deployment Summary ---");
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`AgentRegistry:     ${registryAddress}`);
  console.log(`ReputationTracker: ${reputationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
