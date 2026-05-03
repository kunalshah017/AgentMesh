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

// Serialize all KV writes to avoid nonce conflicts on the 0G chain
const writeQueue: Array<() => Promise<void>> = [];
let writeInProgress = false;

async function drainWriteQueue(): Promise<void> {
  if (writeInProgress) return;
  writeInProgress = true;
  while (writeQueue.length > 0) {
    const task = writeQueue.shift()!;
    await task();
  }
  writeInProgress = false;
}

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    });
    drainWriteQueue();
  });
}

/**
 * Upload JSON data to 0G KV Storage and return the root hash / reference.
 * Uses the 0G SDK Batcher for writes and KvClient for reads.
 */
export async function uploadToStorage(
  data: Record<string, unknown>,
  indexerUrl?: string,
  rpcUrl?: string,
  privateKey?: string,
  customKey?: string,
): Promise<string> {
  const jsonData = JSON.stringify(data);
  const bytes = Buffer.from(jsonData, "utf8");
  const contentHash = ethers.keccak256(bytes);

  // Use custom key if provided, otherwise generate a unique one
  const key =
    customKey ?? `agentmesh/${Date.now()}-${contentHash.slice(2, 10)}`;

  const pk = privateKey ?? process.env.PRIVATE_KEY;
  if (!pk) {
    console.log(
      `  📦 [0G Storage] No private key — content-addressed: ${contentHash.slice(0, 18)}...`,
    );
    return contentHash;
  }

  // Serialize writes through queue to prevent nonce conflicts
  return enqueueWrite(async () => {
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
  });
}

/**
 * Batch-upload multiple KV entries in a single 0G transaction.
 * Significantly reduces gas cost and latency vs. individual writes.
 */
export async function batchUploadToStorage(
  entries: Array<{ key: string; data: Record<string, unknown> }>,
  privateKey?: string,
): Promise<string[]> {
  if (entries.length === 0) return [];

  const pk = privateKey ?? process.env.PRIVATE_KEY;
  if (!pk) {
    return entries.map((e) => {
      const hash = ethers.keccak256(
        Buffer.from(JSON.stringify(e.data), "utf8"),
      );
      console.log(
        `  📦 [0G Storage] No private key — content-addressed: ${hash.slice(0, 18)}...`,
      );
      return hash;
    });
  }

  return enqueueWrite(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(ZERO_G.chainRpc);
      const signer = new ethers.Wallet(pk, provider);
      const indexer = new Indexer(INDEXER_RPC);

      const [nodes, selectError] = await indexer.selectNodes(1);
      if (selectError !== null) {
        throw new Error(`Node selection failed: ${selectError.message}`);
      }

      const status = await nodes[0]?.getStatus();
      const flowAddress = status?.networkIdentity?.flowAddress;
      if (!flowAddress) {
        throw new Error("Storage node did not return flow contract address");
      }

      const flow = getFlowContract(flowAddress, signer as any);
      const batcher = new Batcher(1, nodes, flow, ZERO_G.chainRpc);

      // Set all KV entries in a single batch
      for (const entry of entries) {
        const bytes = Buffer.from(JSON.stringify(entry.data), "utf8");
        batcher.streamDataBuilder.set(
          STREAM_ID,
          Buffer.from(entry.key, "utf8"),
          bytes,
        );
      }

      const [result, uploadError] = await batcher.exec({
        finalityRequired: false,
        expectedReplica: 1,
      });

      if (uploadError !== null) {
        throw new Error(`KV batch write failed: ${uploadError.message}`);
      }

      const rootHash = result.rootHash ?? "";
      const txHash = result.txHash ?? "";
      console.log(
        `  📦 [0G Storage] Batch written (${entries.length} keys) rootHash=${rootHash.slice(0, 18)}... txHash=${txHash.slice(0, 18)}...`,
      );

      return entries.map(() => rootHash);
    } catch (error) {
      console.log(
        `  ⚠️ [0G Storage] Batch write failed (${error}), using content hashes`,
      );
      return entries.map((e) =>
        ethers.keccak256(Buffer.from(JSON.stringify(e.data), "utf8")),
      );
    }
  });
}

/**
 * Download and parse all KV pairs from a 0G blob by rootHash.
 * Returns a map of key → parsed JSON value.
 *
 * Blob format: binary header contains stream_id + key entries (with length prefixes),
 * followed by JSON values in the same order.
 */
export async function downloadBlobAsKvPairs(
  rootHash: string,
  indexerUrl?: string,
): Promise<Map<string, Record<string, unknown>>> {
  const indexer = new Indexer(indexerUrl ?? INDEXER_RPC);
  const [blob, err] = await indexer.downloadToBlob(rootHash);
  if (err) throw new Error(`Download failed: ${err.message}`);

  const buf = Buffer.from(await blob.arrayBuffer());
  const text = buf.toString("utf8");
  const results = new Map<string, Record<string, unknown>>();

  // Find the first JSON object to split header from values
  const firstJson = text.indexOf('{"type"');
  if (firstJson < 0) return results;

  // Extract keys from header section only (before JSON values start)
  const header = text.slice(0, firstJson);
  const keyPattern = /agentmesh\/[a-z0-9\-\/\.]+/g;
  let match: RegExpExecArray | null;
  const keys: string[] = [];
  while ((match = keyPattern.exec(header)) !== null) {
    keys.push(match[0]);
  }

  // Extract all top-level JSON objects with a "type" field
  const jsonObjects: Array<Record<string, unknown>> = [];
  let searchFrom = firstJson;
  while (searchFrom < text.length) {
    const start = text.indexOf("{", searchFrom);
    if (start < 0) break;

    let depth = 0;
    let end = start;
    for (let j = start; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    if (end <= start) break;

    try {
      const obj = JSON.parse(text.slice(start, end));
      if (obj && typeof obj === "object" && obj.type) {
        jsonObjects.push(obj);
        searchFrom = end;
        continue;
      }
    } catch {
      // Not valid JSON
    }
    searchFrom = start + 1;
  }

  // Pair keys with JSON objects in order (1:1 mapping)
  for (let i = 0; i < Math.min(keys.length, jsonObjects.length); i++) {
    results.set(keys[i], jsonObjects[i]);
  }

  return results;
}

/**
 * Download JSON data from 0G Storage by rootHash.
 * Extracts a specific key's value from the KV blob.
 */
export async function downloadFromStorageByRoot(
  rootHash: string,
  key: string,
  indexerUrl?: string,
): Promise<Record<string, unknown>> {
  const pairs = await downloadBlobAsKvPairs(rootHash, indexerUrl);
  const value = pairs.get(key);
  if (value) return value;
  throw new Error(`Key ${key} not found in blob ${rootHash}`);
}

/**
 * Download JSON data from 0G KV Storage by key.
 * Tries KV node first, falls back to error.
 */
export async function downloadFromStorage(
  key: string,
  kvRpc?: string,
): Promise<Record<string, unknown>> {
  const kv = new KvClient(kvRpc ?? KV_RPC);
  const keyBytes = Buffer.from(key, "utf8");

  try {
    const value = await kv.getValue(STREAM_ID, keyBytes);
    if (value && value.data && value.size > 0) {
      const decoded = Buffer.from(value.data, "base64").toString("utf8");
      return JSON.parse(decoded) as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  throw new Error(`Could not retrieve ${key} from 0G KV Storage`);
}

/**
 * Scan recent storage node transactions to find rootHashes containing a key prefix.
 * Filters by sender address first (cheap metadata check) to avoid downloading
 * every blob on the network. Returns only matching rootHashes.
 */
export async function scanRecentRootHashes(
  keyPrefix: string,
  scanCount = 50,
  indexerUrl?: string,
): Promise<string[]> {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) return [];

  // Our write wallet — only scan blobs submitted by us
  const ourAddress = new ethers.Wallet(pk).address.toLowerCase();

  const indexer = new Indexer(indexerUrl ?? INDEXER_RPC);
  const [nodes, selectError] = await indexer.selectNodes(1);
  if (selectError !== null || nodes.length === 0) return [];

  const node = nodes[0];
  const status = await node.getStatus();
  const latestSeq = status.nextTxSeq;
  const rootHashes: string[] = [];

  console.log(
    `  🔍 [0G] Scanning last ${scanCount} txSeqs for ${keyPrefix} (sender=${ourAddress.slice(0, 10)}...)`,
  );

  // Scan backwards
  for (
    let seq = latestSeq - 1;
    seq >= Math.max(0, latestSeq - scanCount);
    seq--
  ) {
    try {
      const info = await node.getFileInfoByTxSeq(seq);
      if (!info || !info.tx) continue;

      // Filter by sender — skip blobs from other wallets (cheap check, no download)
      const tx = info.tx as Record<string, any>;
      const sender = (tx.sender ?? tx.from ?? tx.seq_sender ?? "")
        .toString()
        .toLowerCase();
      if (sender && sender !== ourAddress) continue;

      // Only check finalized files with data
      if (!info.finalized || !info.uploadedSegNum) continue;

      // Download and check content for our key prefix
      try {
        const [blob, err] = await indexer.downloadToBlob(
          info.tx.dataMerkleRoot,
        );
        if (err) continue;
        const text = Buffer.from(await blob.arrayBuffer()).toString("utf8");
        if (text.includes(keyPrefix)) {
          rootHashes.push(info.tx.dataMerkleRoot);
          // Found most recent — stop scanning
          break;
        }
      } catch {
        // Download failed — skip
      }
    } catch {
      // Skip this txSeq
    }
  }

  return rootHashes;
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
