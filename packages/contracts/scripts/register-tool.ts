/**
 * Register a new tool provider on-chain in the AgentRegistry.
 *
 * Usage:
 *   bun run packages/contracts/scripts/register-tool.ts \
 *     --name "gas-optimizer.agentmesh.eth" \
 *     --key "abc123..." \
 *     --capabilities "gas-prediction,fee-estimation" \
 *     --price "0.005"
 *
 * Requires: PRIVATE_KEY in .env (must be the deployer/owner wallet)
 */

import { ethers } from "ethers";

const REGISTRY_ADDRESS = "0x0B05236c972DbFCe91519a183980F0D5fFd9da28";
const RPC_URL = "https://evmrpc-testnet.0g.ai";

const REGISTRY_ABI = [
  "function registerAgent(string ensName, string axlPeerKey, string[] capabilities, uint256 pricePerCall) returns (bytes32)",
  "function getAgent(bytes32 id) view returns (address owner, string ensName, string axlPeerKey, string[] capabilities, uint256 pricePerCall, uint256 registeredAt, bool active)",
  "function getAllAgentIds() view returns (bytes32[])",
];

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return "";
    return args[idx + 1];
  };

  const ensName = getArg("--name");
  const axlPeerKey = getArg("--key");
  const capabilitiesStr = getArg("--capabilities");
  const priceStr = getArg("--price") || "0.01";

  if (!ensName || !axlPeerKey || !capabilitiesStr) {
    console.log(`
Usage: bun run register-tool.ts --name <ensName> --key <axlPeerKey> --capabilities <comma-separated> --price <USDC>

Example:
  bun run register-tool.ts \\
    --name "gas-optimizer.agentmesh.eth" \\
    --key "a1b2c3d4e5f6..." \\
    --capabilities "gas-prediction,fee-estimation" \\
    --price "0.005"
    `);
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not set in environment");
    process.exit(1);
  }

  const capabilities = capabilitiesStr.split(",").map((c) => c.trim());
  const pricePerCall = ethers.parseUnits(priceStr, 6); // USDC 6 decimals

  console.log("\n📝 Registering tool on AgentRegistry (0G Chain)...");
  console.log(`   Name:         ${ensName}`);
  console.log(`   AXL Key:      ${axlPeerKey.slice(0, 16)}...`);
  console.log(`   Capabilities: ${capabilities.join(", ")}`);
  console.log(`   Price:        ${priceStr} USDC/call`);
  console.log();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  try {
    const tx = await registry.registerAgent(
      ensName,
      axlPeerKey,
      capabilities,
      pricePerCall,
    );
    console.log(`   ⏳ Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Read back the registered agent
    const id = ethers.keccak256(ethers.toUtf8Bytes(ensName));
    const agent = await registry.getAgent(id);
    console.log(`\n   📋 Registered Agent:`);
    console.log(`      ID:           ${id}`);
    console.log(`      Owner:        ${agent[0]}`);
    console.log(`      ENS:          ${agent[1]}`);
    console.log(`      AXL Key:      ${agent[2].slice(0, 16)}...`);
    console.log(`      Capabilities: ${agent[3].join(", ")}`);
    console.log(`      Price:        ${ethers.formatUnits(agent[4], 6)} USDC`);
    console.log(
      `      Registered:   ${new Date(Number(agent[5]) * 1000).toISOString()}`,
    );
    console.log(`      Active:       ${agent[6]}`);

    // Show total registered
    const allIds = await registry.getAllAgentIds();
    console.log(`\n   🌐 Total agents in registry: ${allIds.length}`);
  } catch (error: any) {
    if (error.message?.includes("Agent already registered")) {
      console.log("   ⚠️ Agent already registered with this name");
    } else {
      console.error(`   ❌ Registration failed: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
