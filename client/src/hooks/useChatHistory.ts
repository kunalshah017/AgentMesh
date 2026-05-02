"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ChatSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatDetail {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: "user" | "mesh" | "system";
    content: string;
    timestamp: number;
    eventType?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export function useChatHistory(walletAddress?: string) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!walletAddress) {
      setChats([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chats/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats ?? []);
      }
    } catch {
      // Network error — silently fail
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchChat = useCallback(
    async (chatId: string): Promise<ChatDetail | null> => {
      if (!walletAddress) return null;
      try {
        const res = await fetch(`${API_URL}/chats/${walletAddress}/${chatId}`);
        if (res.ok) return await res.json();
      } catch {
        // Network error
      }
      return null;
    },
    [walletAddress],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!walletAddress) return;
      try {
        await fetch(`${API_URL}/chats/${walletAddress}/${chatId}`, {
          method: "DELETE",
        });
        setChats((prev) => prev.filter((c) => c.id !== chatId));
      } catch {
        // ignore
      }
    },
    [walletAddress],
  );

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return { chats, loading, fetchChats, fetchChat, deleteChat };
}
