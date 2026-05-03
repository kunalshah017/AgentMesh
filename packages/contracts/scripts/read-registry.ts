import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.getContractAt(
    "AgentRegistry",
    "0x617eDCC3068774492a20E2B5d23f155e0CCA73Db",
  );
  const count = await registry.getAgentCount();
  console.log("Provider count:", count.toString());
  const ids = await registry.getAllAgentIds();
  for (const id of ids) {
    const agent = await registry.getAgent(id);
    console.log(
      `Provider: ${agent.ensName} | endpoint: ${agent.endpoint || "(none)"} | active: ${agent.active} | categories: ${agent.categories}`,
    );
  }
}

main().catch(console.error);
