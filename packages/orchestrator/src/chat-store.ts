// Chat store — persisted to 0G KV Storage + local JSON cache
// Each user (wallet) has multiple chats, each chat has messages.
// In-memory cache with async write-through to 0G decentralized storage.
// Local JSON file provides instant reads; 0G provides decentralized persistence.

import { v4 as uuid } from "uuid";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { batchUploadToStorage, downloadFromStorage } from "@agentmesh/shared";

// Local cache directory (next to dist/)
const CACHE_DIR = join(__dirname, "..", ".chat-cache");

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

  /** Local cache file path for a wallet */
  private localCachePath(walletAddress: string): string {
    return join(CACHE_DIR, `${walletAddress.toLowerCase()}.json`);
  }

  /** Save all chats for a wallet to local JSON */
  private saveLocalCache(walletAddress: string): void {
    const addr = walletAddress.toLowerCase();
    const userChats = this.getUserChats(addr);
    const data = Array.from(userChats.values());
    try {
      if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(this.localCachePath(addr), JSON.stringify(data));
    } catch {
      // Non-critical
    }
  }

  /** Load chats from local JSON cache */
  private loadLocalCache(walletAddress: string): boolean {
    const addr = walletAddress.toLowerCase();
    const filePath = this.localCachePath(addr);
    try {
      if (!existsSync(filePath)) return false;
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw) as Chat[];
      if (!Array.isArray(data) || data.length === 0) return false;
      for (const chat of data) {
        this.getUserChats(addr).set(chat.id, chat);
      }
      console.log(
        `  📦 [Local] Loaded ${data.length} chats for ${addr.slice(0, 10)}...`,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Deterministic key for a wallet's chat index */
  private indexKey(walletAddress: string): string {
    return `agentmesh/chats/${walletAddress.toLowerCase()}/index`;
  }

  /** Deterministic key for a specific chat */
  private chatKey(walletAddress: string, chatId: string): string {
    return `agentmesh/chats/${walletAddress.toLowerCase()}/${chatId}`;
  }

  /** Load a wallet's chats from local cache or 0G Storage */
  async loadWalletChats(walletAddress: string): Promise<void> {
    const addr = walletAddress.toLowerCase();
    if (this.loadedWallets.has(addr)) return;

    // Dedup concurrent loads
    if (this.loadingWallets.has(addr)) {
      await this.loadingWallets.get(addr);
      return;
    }

    const loadPromise = (async () => {
      // Try local cache first (instant)
      if (this.loadLocalCache(addr)) {
        this.loadedWallets.add(addr);
        return;
      }

      // Fall back to 0G KV Storage
      try {
        const indexData = await downloadFromStorage(this.indexKey(addr));
        if (
          indexData.type === "agentmesh-chat-index" &&
          Array.isArray(indexData.chats)
        ) {
          const chatEntries = indexData.chats as Array<{
            id: string;
            title: string;
            createdAt: number;
            updatedAt: number;
            messageCount: number;
          }>;

          // Load each chat's full data
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
              // Individual chat load failed — skip it
            }
          }
          console.log(
            `  📦 [0G] Loaded ${chatEntries.length} chats for ${addr.slice(0, 10)}...`,
          );
        }
      } catch (err) {
        // No index found — first time user or 0G unavailable
        console.log(
          `  📦 [0G] No chat index found for ${addr.slice(0, 10)}... (${err instanceof Error ? err.message : "unavailable"})`,
        );
      }
      this.loadedWallets.add(addr);
    })();

    this.loadingWallets.set(addr, loadPromise);
    await loadPromise;
    this.loadingWallets.delete(addr);
  }

  /** Persist chat data + index in a single 0G transaction (non-blocking) */
  private persistChatAndIndex(chat: Chat): void {
    const addr = chat.walletAddress.toLowerCase();

    // Always save to local cache immediately
    this.saveLocalCache(addr);

    const chatData = {
      type: "agentmesh-chat",
      version: "1.0",
      chatId: chat.id,
      walletAddress: addr,
      title: chat.title,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    const userChats = this.getUserChats(addr);
    const indexData = {
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
    };

    const chatKey = this.chatKey(addr, chat.id);
    const indexKey = this.indexKey(addr);

    batchUploadToStorage([
      { key: chatKey, data: chatData as Record<string, unknown> },
      { key: indexKey, data: indexData as Record<string, unknown> },
    ])
      .then(([chatHash]) => {
        if (chatHash) chat.storageHash = chatHash;
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

    // Debounce: only persist after 2s of no new messages
    const timerKey = `${walletAddress}/${chatId}`;
    const existing = this.persistTimers.get(timerKey);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      timerKey,
      setTimeout(() => {
        this.persistTimers.delete(timerKey);
        this.persistChatAndIndex(chat);
      }, 2000),
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
