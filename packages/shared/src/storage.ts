// 0G Storage Utilities
// Uses the 0G Storage indexer API for uploading/downloading JSON data

import { ZERO_G } from "./constants.js";

/**
 * Upload JSON data to 0G Storage and return the root hash.
 * Uses the 0G Storage Turbo indexer for fast uploads.
 */
export async function uploadToStorage(
  data: Record<string, unknown>,
  indexerUrl?: string,
  rpcUrl?: string,
  privateKey?: string,
): Promise<string> {
  const url = indexerUrl ?? ZERO_G.storageIndexer;
  const jsonData = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonData);

  try {
    // Try the 0G indexer upload API
    const response = await fetch(`${url}/file`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.length),
      },
      body: bytes,
    });

    if (response.ok) {
      const result = (await response.json()) as { root?: string };
      if (result.root) return result.root;
    }
  } catch {
    // Fall through to local storage
  }

  // Fallback: hash-based local reference (for demo when 0G isn't available)
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const rootHash =
    "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log(
    `  📦 [0G Storage mock] Saved ${bytes.length} bytes → ${rootHash.slice(0, 18)}...`,
  );
  return rootHash;
}

/**
 * Download JSON data from 0G Storage by root hash.
 */
export async function downloadFromStorage(
  rootHash: string,
  indexerUrl?: string,
): Promise<Record<string, unknown>> {
  const url = indexerUrl ?? ZERO_G.storageIndexer;

  try {
    const response = await fetch(`${url}/file/${rootHash}`);
    if (response.ok) {
      return (await response.json()) as Record<string, unknown>;
    }
  } catch {
    // Fall through
  }

  throw new Error(`Could not retrieve ${rootHash} from 0G Storage`);
}

/**
 * Store a conversation log to 0G Storage.
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
 * Store agent state snapshot to 0G Storage.
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
