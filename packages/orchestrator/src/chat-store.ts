// Chat store — persisted to 0G KV Storage
// Each user (wallet) has multiple chats, each chat has messages.
// In-memory cache with async write-through to 0G decentralized storage.

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

  /** Get or create a map of chats for a wallet */
  private getUserChats(walletAddress: string): Map<string, Chat> {
    const addr = walletAddress.toLowerCase();
    if (!this.chats.has(addr)) {
      this.chats.set(addr, new Map());
    }
    return this.chats.get(addr)!;
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

    uploadToStorage(data as Record<string, unknown>)
      .then((hash) => {
        chat.storageHash = hash;
        console.log(
          `  📦 [0G] Chat ${chat.id.slice(0, 8)} persisted → ${hash.slice(0, 18)}...`,
        );
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

    uploadToStorage(index as Record<string, unknown>)
      .then((hash) => {
        console.log(
          `  📦 [0G] Chat index for ${addr.slice(0, 8)}... → ${hash.slice(0, 18)}...`,
        );
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

  /** Add a message to a chat and persist to 0G */
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

    // Persist updated chat to 0G (debounced by nature of async)
    this.persistTo0G(chat);
    return message;
  }

  /** Delete a chat */
  deleteChat(walletAddress: string, chatId: string): boolean {
    const deleted = this.getUserChats(walletAddress).delete(chatId);
    if (deleted) this.persistIndex(walletAddress);
    return deleted;
  }

  /** Load a chat from 0G Storage by key (for rehydration) */
  async loadFromStorage(key: string): Promise<Chat | null> {
    try {
      const data = await downloadFromStorage(key);
      if (data.type === "agentmesh-chat" && data.chatId) {
        const chat: Chat = {
          id: data.chatId as string,
          walletAddress: data.walletAddress as string,
          title: data.title as string,
          messages: data.messages as ChatMessage[],
          createdAt: data.createdAt as number,
          updatedAt: data.updatedAt as number,
          storageHash: key,
        };
        // Cache it
        this.getUserChats(chat.walletAddress).set(chat.id, chat);
        return chat;
      }
    } catch {
      // Not found or corrupted
    }
    return null;
  }
}

// Singleton
export const chatStore = new ChatStore();
