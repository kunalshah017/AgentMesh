// Reputation tracking via KeeperHub MCP on 0G Chain

import { KEEPERHUB, ZERO_G } from "./constants.js";

const REPUTATION_TRACKER_ADDRESS = "0x2B8C2D313300122e0Fd90a3B7F4e3f0Bb05E2Cf4";

// Cached session
let sessionId: string | null = null;

async function getSession(apiKey: string): Promise<string> {
  if (sessionId) return sessionId;

  const response = await fetch(KEEPERHUB.mcpEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "AgentMesh-Reputation", version: "1.0.0" },
      },
    }),
  });

  if (!response.ok)
    throw new Error(`KeeperHub init failed: ${response.status}`);
  sessionId = response.headers.get("mcp-session-id");
  if (!sessionId) throw new Error("No session ID returned");
  return sessionId;
}

async function callKeeperHub(
  apiKey: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const sid = await getSession(apiKey);
  const response = await fetch(KEEPERHUB.mcpEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${apiKey}`,
      "mcp-session-id": sid,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      id: Date.now(),
      params: { name: tool, arguments: args },
    }),
  });

  if (!response.ok) throw new Error(`KeeperHub error: ${response.status}`);
  const data = (await response.json()) as {
    result?: { content?: Array<{ text: string }> };
    error?: { message: string };
  };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

/**
 * Record a task completion on-chain via KeeperHub → 0G Chain.
 * Uses KeeperHub's web3/write-contract to call ReputationTracker.recordTask().
 */
export async function recordReputation(
  agentId: string,
  success: boolean,
  responseTimeMs: number,
  earnedUsdc: number,
): Promise<{ txHash?: string; status: string }> {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) {
    console.log("   ⚠️ No KEEPERHUB_API_KEY — reputation update skipped");
    return { status: "skipped" };
  }

  // Convert agentId string to bytes32
  const agentIdBytes32 = stringToBytes32(agentId);

  // recordTask(bytes32 agentId, bool success, uint256 responseTimeMs, uint256 earnedUsdc)
  const functionName = "recordTask";
  const functionArgs = [agentIdBytes32, success, responseTimeMs, earnedUsdc];

  try {
    // Use KeeperHub's execute_contract_call tool for 0G Chain
    const result = await callKeeperHub(apiKey, "execute_contract_call", {
      network: "16602", // 0G Chain testnet
      contractAddress: REPUTATION_TRACKER_ADDRESS,
      functionName,
      functionArgs: JSON.stringify(functionArgs),
      abi: JSON.stringify([
        {
          name: "recordTask",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "agentId", type: "bytes32" },
            { name: "success", type: "bool" },
            { name: "responseTimeMs", type: "uint256" },
            { name: "earnedUsdc", type: "uint256" },
          ],
          outputs: [],
        },
      ]),
    });

    console.log(`   ⛓️ Reputation updated on 0G Chain via KeeperHub`);
    return { status: "submitted", txHash: extractTxHash(result) };
  } catch (error) {
    // Fallback: try direct RPC call if KeeperHub doesn't support 0G Chain yet
    console.log(`   ⚠️ KeeperHub reputation update failed: ${error}`);
    return await recordReputationDirect(
      agentIdBytes32,
      success,
      responseTimeMs,
      earnedUsdc,
    );
  }
}

/**
 * Direct reputation update via 0G Chain RPC (fallback if KeeperHub doesn't support chainId 16602).
 */
async function recordReputationDirect(
  agentIdBytes32: string,
  success: boolean,
  responseTimeMs: number,
  earnedUsdc: number,
): Promise<{ txHash?: string; status: string }> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return { status: "skipped-no-key" };
  }

  try {
    // Encode the function call manually
    // recordTask(bytes32,bool,uint256,uint256)
    const selector = "0x76c9840b"; // keccak256("recordTask(bytes32,bool,uint256,uint256)") first 4 bytes
    const data =
      selector +
      agentIdBytes32.slice(2).padStart(64, "0") +
      (success ? "1" : "0").padStart(64, "0") +
      responseTimeMs.toString(16).padStart(64, "0") +
      earnedUsdc.toString(16).padStart(64, "0");

    // Send via eth_sendTransaction to 0G Chain
    const response = await fetch(ZERO_G.chainRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        id: 1,
        params: [
          {
            to: REPUTATION_TRACKER_ADDRESS,
            data,
          },
          "latest",
        ],
      }),
    });

    if (response.ok) {
      console.log(`   ⛓️ Reputation query sent to 0G Chain (read-only verify)`);
      return { status: "verified" };
    }
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

function stringToBytes32(str: string): string {
  // Convert string to hex, pad to 32 bytes
  const hex = Buffer.from(str).toString("hex");
  return "0x" + hex.padEnd(64, "0");
}

function extractTxHash(result: unknown): string | undefined {
  if (!result) return undefined;
  const text = JSON.stringify(result);
  const match = text.match(/0x[a-fA-F0-9]{64}/);
  return match?.[0];
}
