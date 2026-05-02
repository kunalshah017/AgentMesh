/**
 * Register a new MCP provider on-chain in the AgentRegistry v2.
 *
 * Usage:
 *   bun run packages/contracts/scripts/register-tool.ts \
 *     --name "gas-optimizer.agent-mesh.eth" \
 *     --endpoint "https://my-mcp-server.com/mcp" \
 *     --categories "gas-prediction,fee-estimation"
 *
 * Requires: PRIVATE_KEY in .env (must be the deployer/owner wallet)
 */

import { ethers } from "ethers";

const REGISTRY_ADDRESS = "0x632B1282B766fb811b3570274A86A4E83838cbDd";
const RPC_URL = "https://evmrpc-testnet.0g.ai";

const REGISTRY_ABI = [
  "function registerAgent(string ensName, string endpoint, string[] categories) returns (bytes32)",
  "function getAgent(bytes32 id) view returns (address owner, string ensName, string endpoint, string[] categories, uint256 registeredAt, bool active)",
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
  const endpoint = getArg("--endpoint") || "";
  const categoriesStr = getArg("--categories");

  if (!ensName || !categoriesStr) {
    console.log(`
Usage: bun run register-tool.ts --name <ensName> --endpoint <url> --categories <comma-separated>

Example:
  bun run register-tool.ts \\
    --name "gas-optimizer.agent-mesh.eth" \\
    --endpoint "https://my-mcp-server.com/mcp" \\
    --categories "gas-prediction,fee-estimation"
    `);
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not set in environment");
    process.exit(1);
  }

  const categories = categoriesStr.split(",").map((c) => c.trim());

  console.log(
    "\n📝 Registering MCP provider on AgentRegistry v2 (0G Chain)...",
  );
  console.log(`   Name:       ${ensName}`);
  console.log(`   Endpoint:   ${endpoint || "(none — will be set later)"}`);
  console.log(`   Categories: ${categories.join(", ")}`);
  console.log(`   Pricing:    x402-native (provider controls via HTTP 402)`);
  console.log();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  try {
    const tx = await registry.registerAgent(ensName, endpoint, categories);
    console.log(`   ⏳ Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Read back the registered provider
    const id = ethers.keccak256(ethers.toUtf8Bytes(ensName));
    const agent = await registry.getAgent(id);
    console.log(`\n   📋 Registered Provider:`);
    console.log(`      ID:         ${id}`);
    console.log(`      Owner:      ${agent[0]}`);
    console.log(`      ENS:        ${agent[1]}`);
    console.log(`      Endpoint:   ${agent[2] || "(not set)"}`);
    console.log(`      Categories: ${agent[3].join(", ")}`);
    console.log(
      `      Registered: ${new Date(Number(agent[4]) * 1000).toISOString()}`,
    );
    console.log(`      Active:     ${agent[5]}`);

    // Show total registered
    const allIds = await registry.getAllAgentIds();
    console.log(`\n   📊 Total providers in registry: ${allIds.length}`);
  } catch (error: any) {
    if (error.message?.includes("already registered")) {
      console.error(
        "❌ This provider is already registered. Use updateEndpoint() to change the URL.",
      );
    } else {
      console.error("❌ Registration failed:", error.message);
    }
    process.exit(1);
  }
}

main().catch(console.error);
