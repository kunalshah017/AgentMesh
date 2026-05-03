/**
 * Fix invalid registry entries:
 * 1. Update ethglobal-skills endpoint from localhost to real URL
 * 2. Deactivate nft-scanner (invalid localhost entry)
 *
 * Usage: bun run packages/contracts/scripts/fix-registry.ts
 * Requires: PRIVATE_KEY in .env
 */

import { ethers } from "ethers";

const REGISTRY_ADDRESS = "0x632B1282B766fb811b3570274A86A4E83838cbDd";
const RPC_URL = "https://evmrpc-testnet.0g.ai";

const REGISTRY_ABI = [
  "function updateEndpoint(bytes32 id, string endpoint) external",
  "function deactivateAgent(bytes32 id) external",
  "function getAgent(bytes32 id) view returns (address owner, string ensName, string endpoint, string[] categories, uint256 registeredAt, bool active)",
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Set PRIVATE_KEY in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  console.log(`\n🔧 Wallet: ${wallet.address}\n`);

  // Compute IDs from ENS names
  const ethglobalId = ethers.keccak256(
    ethers.toUtf8Bytes("ethglobal-skills.agent-mesh.eth"),
  );
  const nftScannerId = ethers.keccak256(
    ethers.toUtf8Bytes("nft-scanner.agent-mesh.eth"),
  );

  // 1. Update ethglobal-skills endpoint
  console.log("📝 Updating ethglobal-skills.agent-mesh.eth endpoint...");
  const newEndpoint = "https://ethglobalskills.vercel.app/api/mcp";

  try {
    const agent = await registry.getAgent(ethglobalId);
    console.log(`   Current: ${agent.endpoint}`);
    console.log(`   New:     ${newEndpoint}`);

    const tx1 = await registry.updateEndpoint(ethglobalId, newEndpoint);
    console.log(`   TX: ${tx1.hash}`);
    await tx1.wait();
    console.log("   ✅ Endpoint updated!\n");
  } catch (err: any) {
    console.error(`   ❌ Failed: ${err.message}\n`);
  }

  // 2. Deactivate nft-scanner
  console.log("🗑️  Deactivating nft-scanner.agent-mesh.eth...");

  try {
    const agent = await registry.getAgent(nftScannerId);
    console.log(`   Current status: active=${agent.active}`);

    if (!agent.active) {
      console.log("   Already deactivated, skipping.\n");
    } else {
      const tx2 = await registry.deactivateAgent(nftScannerId);
      console.log(`   TX: ${tx2.hash}`);
      await tx2.wait();
      console.log("   ✅ Deactivated!\n");
    }
  } catch (err: any) {
    console.error(`   ❌ Failed: ${err.message}\n`);
  }

  console.log("🎉 Done!");
}

main().catch(console.error);
