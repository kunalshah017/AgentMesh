// Chat store — persisted to 0G KV Storage
// Each user (wallet) has multiple chats, each chat has messages.
// In-memory cache with async write-through to 0G decentralized storage.
// On first access per wallet, rehydrates from 0G using deterministic keys.

import { v4 as uuid } from "uuid";
import {
  batchUploadToStorage,
  downloadFromStorage,
  downloadBlobAsKvPairs,
  scanRecentRootHashes,
  setChatRootHashOnChain,
  getChatRootHashFromChain,
} from "@agentmesh/shared";

export interface ChatMessage {
  id: string;
  role: "user" | "mesh" | "system";
  content: string;
  timestamp: number;
  eventType?: string; // tool, payment, success, error, done
  metadata?: Record<string, unknown>;
}

export interface Chat {
  id: string;
  walletAddress: string;
  title: string; // First goal as title
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  storageHash?: string; // 0G Storage reference
}

class ChatStore {
  // walletAddress → chatId → Chat (in-memory cache)
  private chats = new Map<string, Map<string, Chat>>();
  // Track which wallets have been loaded from 0G
  private loadedWallets = new Set<string>();
  // Track in-progress loads to avoid duplicate fetches
  private loadingWallets = new Map<string, Promise<void>>();
  // Debounce timers for chat persistence
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Get or create a map of chats for a wallet */
  private getUserChats(walletAddress: string): Map<string, Chat> {
    const addr = walletAddress.toLowerCase();
    if (!this.chats.has(addr)) {
      this.chats.set(addr, new Map());
    }
    return this.chats.get(addr)!;
  }

  /** Deterministic key for a wallet's chat index */
  private indexKey(walletAddress: string): string {
    return `agentmesh/chats/${walletAddress.toLowerCase()}/index`;
  }

  /** Deterministic key for a specific chat */
  private chatKey(walletAddress: string, chatId: string): string {
    return `agentmesh/chats/${walletAddress.toLowerCase()}/${chatId}`;
  }

  // Track the latest rootHash for each wallet (from writes)
  private latestRootHash = new Map<string, string>();

  /** Load a wallet's chats from 0G Storage (called on first access) */
  async loadWalletChats(walletAddress: string): Promise<void> {
    const addr = walletAddress.toLowerCase();
    if (this.loadedWallets.has(addr)) return;

    // Dedup concurrent loads
    if (this.loadingWallets.has(addr)) {
      await this.loadingWallets.get(addr);
      return;
    }

    const loadPromise = (async () => {
      // Strategy 1: Try KV node (fast if working)
      let loaded = false;
      try {
        const indexData = await downloadFromStorage(this.indexKey(addr));
        if (
          indexData.type === "agentmesh-chat-index" &&
          Array.isArray(indexData.chats)
        ) {
          await this.loadFromIndex(addr, indexData);
          loaded = true;
        }
      } catch {
        // KV node unavailable — try rootHash fallback
      }

      // Strategy 2: Read rootHash from on-chain registry (survives restarts)
      if (!loaded) {
        let rootHash = this.latestRootHash.get(addr);
        if (!rootHash) {
          rootHash = (await getChatRootHashFromChain(addr)) ?? undefined;
          if (rootHash) this.latestRootHash.set(addr, rootHash);
        }
        if (rootHash) {
          try {
            const pairs = await downloadBlobAsKvPairs(rootHash);
            this.loadFromKvPairs(addr, pairs);
            loaded = true;
          } catch {
            // rootHash download failed
          }
        }
      }

      // Strategy 3: Scan recent storage txs for this wallet's data (slow, last resort)
      if (!loaded) {
        try {
          const prefix = `agentmesh/chats/${addr}`;
          const rootHashes = await scanRecentRootHashes(prefix, 20);
          if (rootHashes.length > 0) {
            const pairs = await downloadBlobAsKvPairs(rootHashes[0]);
            this.loadFromKvPairs(addr, pairs);
            this.latestRootHash.set(addr, rootHashes[0]);
            loaded = true;
          }
        } catch {
          // Scan failed
        }
      }

      if (!loaded) {
        console.log(
          `  📦 [0G] No chat history found for ${addr.slice(0, 10)}... (new user or KV node not synced)`,
        );
      }
      this.loadedWallets.add(addr);
    })();

    this.loadingWallets.set(addr, loadPromise);
    await loadPromise;
    this.loadingWallets.delete(addr);
  }

  /** Load chats from index data (used by KV node path) */
  private async loadFromIndex(
    addr: string,
    indexData: Record<string, unknown>,
  ): Promise<void> {
    const chatEntries = indexData.chats as Array<{
      id: string;
      title: string;
      createdAt: number;
      updatedAt: number;
      messageCount: number;
    }>;

    for (const entry of chatEntries) {
      try {
        const chatData = await downloadFromStorage(
          this.chatKey(addr, entry.id),
        );
        if (chatData.type === "agentmesh-chat" && chatData.chatId) {
          const chat: Chat = {
            id: chatData.chatId as string,
            walletAddress: addr,
            title: chatData.title as string,
            messages: (chatData.messages as ChatMessage[]) ?? [],
            createdAt: chatData.createdAt as number,
            updatedAt: chatData.updatedAt as number,
            storageHash: this.chatKey(addr, entry.id),
          };
          this.getUserChats(addr).set(chat.id, chat);
        }
      } catch {
        // Individual chat load failed — skip
      }
    }
    console.log(
      `  📦 [0G] Loaded ${chatEntries.length} chats for ${addr.slice(0, 10)}...`,
    );
  }

  /** Load chats from raw KV pairs (used by rootHash download path) */
  private loadFromKvPairs(
    addr: string,
    pairs: Map<string, Record<string, unknown>>,
  ): void {
    let count = 0;
    for (const [key, data] of pairs) {
      if (data.type === "agentmesh-chat" && data.chatId && key.includes(addr)) {
        const chat: Chat = {
          id: data.chatId as string,
          walletAddress: addr,
          title: data.title as string,
          messages: (data.messages as ChatMessage[]) ?? [],
          createdAt: data.createdAt as number,
          updatedAt: data.updatedAt as number,
          storageHash: key,
        };
        this.getUserChats(addr).set(chat.id, chat);
        count++;
      }
    }
    if (count > 0) {
      console.log(
        `  📦 [0G] Loaded ${count} chats from storage for ${addr.slice(0, 10)}...`,
      );
    }
  }

  /** Persist ALL chats + index in a single 0G transaction (non-blocking) */
  private persistChatAndIndex(chat: Chat): void {
    const addr = chat.walletAddress.toLowerCase();
    const userChats = this.getUserChats(addr);

    // Build entries for ALL chats (so the latest blob is a full snapshot)
    const entries: Array<{ key: string; data: Record<string, unknown> }> = [];

    for (const c of userChats.values()) {
      entries.push({
        key: this.chatKey(addr, c.id),
        data: {
          type: "agentmesh-chat",
          version: "1.0",
          chatId: c.id,
          walletAddress: addr,
          title: c.title,
          messages: c.messages,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        } as Record<string, unknown>,
      });
    }

    // Append index as the last entry
    entries.push({
      key: this.indexKey(addr),
      data: {
        type: "agentmesh-chat-index",
        version: "1.0",
        walletAddress: addr,
        chats: Array.from(userChats.values()).map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c.messages.length,
          storageHash: c.storageHash,
        })),
        updatedAt: Date.now(),
      } as Record<string, unknown>,
    });

    batchUploadToStorage(entries)
      .then(([chatHash]) => {
        if (chatHash) {
          chat.storageHash = chatHash;
          // Track the latest rootHash for this wallet (enables rehydration)
          this.latestRootHash.set(addr, chatHash);
          // Store on-chain so it survives server restarts (fire-and-forget)
          setChatRootHashOnChain(chatHash).catch(() => {});
        }
        console.log(
          `  📦 [0G] Chat ${chat.id.slice(0, 8)} + index persisted (1 tx)`,
        );
      })
      .catch((err) => {
        console.log(`  ⚠️ [0G] Batch persist failed: ${err}`);
      });
  }

  /** Create a new chat for a user */
  createChat(walletAddress: string, title: string): Chat {
    const chat: Chat = {
      id: uuid(),
      walletAddress: walletAddress.toLowerCase(),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.getUserChats(walletAddress).set(chat.id, chat);
    // Don't persist empty chat — first addMessage will trigger debounced persist
    return chat;
  }

  /** Get all chats for a user (sorted by most recent) */
  listChats(walletAddress: string): Chat[] {
    const userChats = this.getUserChats(walletAddress);
    return Array.from(userChats.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  /** Get a specific chat */
  getChat(walletAddress: string, chatId: string): Chat | undefined {
    return this.getUserChats(walletAddress).get(chatId);
  }

  /** Add a message to a chat and persist to 0G (debounced) */
  addMessage(
    walletAddress: string,
    chatId: string,
    role: ChatMessage["role"],
    content: string,
    eventType?: string,
    metadata?: Record<string, unknown>,
  ): ChatMessage | undefined {
    const chat = this.getChat(walletAddress, chatId);
    if (!chat) return undefined;

    const message: ChatMessage = {
      id: uuid(),
      role,
      content,
      timestamp: Date.now(),
      eventType,
      metadata,
    };
    chat.messages.push(message);
    chat.updatedAt = Date.now();

    // Debounce: only persist after 5s of no new messages (batches user + assistant msgs)
    const timerKey = `${walletAddress}/${chatId}`;
    const existing = this.persistTimers.get(timerKey);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      timerKey,
      setTimeout(() => {
        this.persistTimers.delete(timerKey);
        this.persistChatAndIndex(chat);
      }, 5000),
    );

    return message;
  }

  /** Delete a chat */
  deleteChat(walletAddress: string, chatId: string): boolean {
    const deleted = this.getUserChats(walletAddress).delete(chatId);
    if (deleted) {
      // Persist updated index (use a dummy chat entry for batch)
      const remaining = Array.from(this.getUserChats(walletAddress).values());
      if (remaining.length > 0) {
        this.persistChatAndIndex(remaining[0]);
      }
    }
    return deleted;
  }
}

// Singleton
export const chatStore = new ChatStore();
