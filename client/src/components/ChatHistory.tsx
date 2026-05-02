"use client";

import type { ChatSummary } from "@/hooks/useChatHistory";

interface ChatHistoryProps {
    chats: ChatSummary[];
    activeChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
    loading: boolean;
}

function formatTime(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60_000) return "now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ChatHistory({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, loading }: ChatHistoryProps) {
    return (
        <div className="flex flex-col h-full bg-neo-white">
            {/* Header */}
            <div className="border-b-4 border-black px-3 py-2 flex items-center justify-between bg-neo-bg">
                <span className="mono text-xs font-black uppercase">Chats</span>
                <button
                    onClick={onNewChat}
                    className="bg-neo-accent border-2 border-black px-2 py-0.5 mono text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                >
                    + New
                </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="px-3 py-4 text-center">
                        <span className="mono text-xs text-black/40">Loading...</span>
                    </div>
                ) : chats.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                        <span className="mono text-xs text-black/40">No chats yet</span>
                        <p className="mono text-[10px] text-black/30 mt-1">
                            Send a goal to start
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-black/10">
                        {chats.map((chat) => (
                            <li
                                key={chat.id}
                                className={`group relative cursor-pointer px-3 py-2 hover:bg-neo-bg transition-colors ${activeChatId === chat.id ? "bg-neo-accent/20 border-l-4 border-neo-accent" : ""
                                    }`}
                                onClick={() => onSelectChat(chat.id)}
                            >
                                <p className="mono text-xs font-bold truncate pr-6">
                                    {chat.title || "Untitled"}
                                </p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="mono text-[10px] text-black/40">
                                        {chat.messageCount} msgs
                                    </span>
                                    <span className="mono text-[10px] text-black/40">
                                        {formatTime(chat.updatedAt)}
                                    </span>
                                </div>
                                {/* Delete button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 mono text-[10px] text-red-500 hover:text-red-700 transition-opacity"
                                    title="Delete chat"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
