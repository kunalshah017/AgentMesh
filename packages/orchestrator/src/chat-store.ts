// Chat store — persisted to 0G KV Storage
// Each user (wallet) has multiple chats, each chat has messages.
// In-memory cache with async write-through to 0G decentralized storage.
// On first access per wallet, rehydrates from 0G using deterministic keys.

import { v4 as uuid } from "uuid";
import { uploadToStorage, downloadFromStorage } from "@agentmesh/shared";

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
      } catch {
        // No index found — first time user or 0G unavailable
      }
      this.loadedWallets.add(addr);
    })();

    this.loadingWallets.set(addr, loadPromise);
    await loadPromise;
    this.loadingWallets.delete(addr);
  }

  /** Persist a chat to 0G Storage (non-blocking) */
  private persistTo0G(chat: Chat): void {
    const data = {
      type: "agentmesh-chat",
      version: "1.0",
      chatId: chat.id,
      walletAddress: chat.walletAddress,
      title: chat.title,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };

    const key = this.chatKey(chat.walletAddress, chat.id);
    uploadToStorage(
      data as Record<string, unknown>,
      undefined,
      undefined,
      undefined,
      key,
    )
      .then((hash) => {
        chat.storageHash = hash;
        console.log(`  📦 [0G] Chat ${chat.id.slice(0, 8)} persisted → ${key}`);
      })
      .catch((err) => {
        console.log(`  ⚠️ [0G] Chat persist failed: ${err}`);
      });
  }

  /** Persist the user's chat index to 0G Storage (non-blocking) */
  private persistIndex(walletAddress: string): void {
    const addr = walletAddress.toLowerCase();
    const userChats = this.getUserChats(addr);
    const index = {
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

    const key = this.indexKey(addr);
    uploadToStorage(
      index as Record<string, unknown>,
      undefined,
      undefined,
      undefined,
      key,
    )
      .then((hash) => {
        console.log(`  📦 [0G] Chat index for ${addr.slice(0, 8)}... → ${key}`);
      })
      .catch(() => {});
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
    this.persistTo0G(chat);
    this.persistIndex(walletAddress);
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
        this.persistTo0G(chat);
      }, 2000),
    );

    return message;
  }

  /** Delete a chat */
  deleteChat(walletAddress: string, chatId: string): boolean {
    const deleted = this.getUserChats(walletAddress).delete(chatId);
    if (deleted) this.persistIndex(walletAddress);
    return deleted;
  }
}

// Singleton
export const chatStore = new ChatStore();
