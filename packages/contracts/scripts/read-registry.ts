import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.getContractAt(
    "AgentRegistry",
    "0x0B05236c972DbFCe91519a183980F0D5fFd9da28",
  );
  const count = await registry.getAgentCount();
  console.log("Agent count:", count.toString());
  const ids = await registry.getAllAgentIds();
  for (const id of ids) {
    const agent = await registry.getAgent(id);
    console.log(
      `Agent: ${agent.ensName} | active: ${agent.active} | caps: ${agent.capabilities}`,
    );
  }
}

main().catch(console.error);
