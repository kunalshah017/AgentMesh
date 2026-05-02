// 0G Storage Utilities
// Uses the 0G KV Storage SDK for real decentralized key-value storage
// Community KV node: http://178.238.236.119:6789 (via 0xAgentio)

import { ethers } from "ethers";
import {
  Batcher,
  Indexer,
  KvClient,
  getFlowContract,
} from "@0gfoundation/0g-ts-sdk";
import { ZERO_G } from "./constants.js";

// Community-hosted 0G KV node (from trivo25.github.io/agentio)
const KV_RPC = process.env.ZG_KV_RPC ?? "http://178.238.236.119:6789";
const INDEXER_RPC =
  process.env.ZG_INDEXER_RPC ?? "https://indexer-storage-testnet-turbo.0g.ai";
// Pick a stream ID from the community node's indexed list
const STREAM_ID =
  process.env.ZG_STREAM_ID ??
  "0x35dd3e73dd3d8474f286fb6f5af5a1e953662d2d5d176994520390e14bad083d";

/**
 * Upload JSON data to 0G KV Storage and return the root hash / reference.
 * Uses the 0G SDK Batcher for writes and KvClient for reads.
 */
export async function uploadToStorage(
  data: Record<string, unknown>,
  indexerUrl?: string,
  rpcUrl?: string,
  privateKey?: string,
): Promise<string> {
  const jsonData = JSON.stringify(data);
  const bytes = Buffer.from(jsonData, "utf8");
  const contentHash = ethers.keccak256(bytes);

  // Generate a unique key for this upload
  const key = `agentmesh/${Date.now()}-${contentHash.slice(2, 10)}`;

  const pk = privateKey ?? process.env.PRIVATE_KEY;
  if (!pk) {
    console.log(
      `  📦 [0G Storage] No private key — content-addressed: ${contentHash.slice(0, 18)}...`,
    );
    return contentHash;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl ?? ZERO_G.chainRpc);
    const signer = new ethers.Wallet(pk, provider);
    const indexer = new Indexer(indexerUrl ?? INDEXER_RPC);

    // Select storage nodes
    const [nodes, selectError] = await indexer.selectNodes(1);
    if (selectError !== null) {
      throw new Error(`Node selection failed: ${selectError.message}`);
    }

    // Get flow contract from storage node
    const status = await nodes[0]?.getStatus();
    const flowAddress = status?.networkIdentity?.flowAddress;
    if (!flowAddress) {
      throw new Error("Storage node did not return flow contract address");
    }

    const flow = getFlowContract(flowAddress, signer as any);
    const batcher = new Batcher(1, nodes, flow, rpcUrl ?? ZERO_G.chainRpc);

    // Set KV entry: stream → key → value
    batcher.streamDataBuilder.set(STREAM_ID, Buffer.from(key, "utf8"), bytes);

    // Execute the write
    const [result, uploadError] = await batcher.exec({
      finalityRequired: false,
      expectedReplica: 1,
    });

    if (uploadError !== null) {
      throw new Error(`KV write failed: ${uploadError.message}`);
    }

    const rootHash = result.rootHash;
    const txHash = result.txHash;
    console.log(
      `  📦 [0G Storage] Written to KV — key=${key} rootHash=${rootHash?.slice(0, 18)}... txHash=${txHash?.slice(0, 18)}...`,
    );

    return rootHash ?? contentHash;
  } catch (error) {
    // Fallback to content-addressed hash
    console.log(
      `  ⚠️ [0G Storage] KV write failed (${error}), using content hash: ${contentHash.slice(0, 18)}...`,
    );
    return contentHash;
  }
}

/**
 * Download JSON data from 0G KV Storage by key.
 */
export async function downloadFromStorage(
  key: string,
  kvRpc?: string,
): Promise<Record<string, unknown>> {
  const kv = new KvClient(kvRpc ?? KV_RPC);
  const encodedKey = ethers.encodeBase64(Buffer.from(key, "utf8"));

  try {
    const value = await kv.getValue(STREAM_ID, encodedKey as any);
    if (value && value.data) {
      const decoded = Buffer.from(value.data, "base64").toString("utf8");
      return JSON.parse(decoded) as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  throw new Error(`Could not retrieve ${key} from 0G KV Storage`);
}

/**
 * Store a conversation log to 0G KV Storage.
 */
export async function storeConversationLog(
  taskId: string,
  goal: string,
  subtasks: Array<{ description: string; status: string; result?: unknown }>,
  indexerUrl?: string,
): Promise<string> {
  const log = {
    type: "agentmesh-conversation",
    version: "1.0",
    taskId,
    goal,
    subtasks,
    timestamp: Date.now(),
  };
  return uploadToStorage(log, indexerUrl);
}

/**
 * Store agent state snapshot to 0G KV Storage.
 */
export async function storeAgentState(
  agentName: string,
  state: Record<string, unknown>,
  indexerUrl?: string,
): Promise<string> {
  const snapshot = {
    type: "agentmesh-state",
    agent: agentName,
    state,
    timestamp: Date.now(),
  };
  return uploadToStorage(snapshot, indexerUrl);
}
