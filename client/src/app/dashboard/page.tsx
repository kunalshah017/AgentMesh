"use client";

import { useState, useEffect, useCallback } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatHistory } from "@/components/ChatHistory";
import { ActivityFeed } from "@/components/ActivityFeed";
import { NetworkGraph } from "@/components/NetworkGraph";
import { Navbar } from "@/components/Navbar";
import { PaymentTicker } from "@/components/PaymentTicker";
import { ToolRegistry } from "@/components/ToolRegistry";
import { PaymentApproval } from "@/components/PaymentApproval";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAccount, useSwitchChain, useSignMessage, useDisconnect } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import type { AgentEvent } from "@/hooks/useOrchestrator";

export default function Dashboard() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Panel refs for programmatic collapse/expand
    const historyPanelRef = usePanelRef();
    const activityPanelRef = usePanelRef();
    const toolsPanelRef = usePanelRef();
    const [historyCollapsed, setHistoryCollapsed] = useState(false);
    const [activityCollapsed, setActivityCollapsed] = useState(false);
    const [toolsCollapsed, setToolsCollapsed] = useState(false);

    const { address, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { signMessageAsync } = useSignMessage();
    const { disconnect } = useDisconnect();
    const walletAddress = mounted ? address : undefined;
    const wrongChain = mounted && !!address && chain?.id !== baseSepolia.id;
    const { status, events, sendGoal, clearEvents, isAuthenticated, currentChatId, pendingPayment, approvePayment, rejectPayment } = useOrchestrator(
        walletAddress,
        walletAddress ? ({ message }) => signMessageAsync({ message }) : undefined,
        disconnect,
    );

    // Chat history
    const { chats, loading: chatsLoading, fetchChats, fetchChat, deleteChat } = useChatHistory(walletAddress);
    const [loadedHistory, setLoadedHistory] = useState<AgentEvent[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    // When a new chat is created, refresh the list
    useEffect(() => {
        if (currentChatId) {
            fetchChats();
            setSelectedChatId(currentChatId);
        }
    }, [currentChatId, fetchChats]);

    // Load a previous chat's messages
    const handleSelectChat = useCallback(async (chatId: string) => {
        setSelectedChatId(chatId);
        if (chatId === currentChatId) {
            // Already viewing this chat — clear loaded history
            setLoadedHistory([]);
            return;
        }
        const chat = await fetchChat(chatId);
        if (chat) {
            // Convert stored messages to events for display
            const historyEvents: AgentEvent[] = chat.messages.map((msg) => ({
                type: msg.role === "user" ? "user_goal" : msg.eventType ?? "task_completed",
                message: msg.content,
                goal: msg.role === "user" ? msg.content : undefined,
                _ts: msg.timestamp,
                _fromHistory: true,
            }));
            setLoadedHistory(historyEvents);
        }
    }, [currentChatId, fetchChat]);

    const handleNewChat = useCallback(() => {
        clearEvents();
        setLoadedHistory([]);
        setSelectedChatId(null);
    }, [clearEvents]);

    const handleDeleteChat = useCallback(async (chatId: string) => {
        await deleteChat(chatId);
        if (selectedChatId === chatId) {
            handleNewChat();
        }
    }, [deleteChat, selectedChatId, handleNewChat]);

    // Show loaded history or live events
    const displayEvents = selectedChatId && selectedChatId !== currentChatId && loadedHistory.length > 0
        ? loadedHistory
        : events;

    // Derive which tool names are currently active from recent events
    const activeTools = new Set<string>();
    const toolActions = new Map<string, string>();
    const recentEvents = events.slice(-15);
    for (const e of recentEvents) {
        if (e.type === "tool_called" || e.type === "subtask_started") {
            // Add provider ENS (e.g. "agent-mesh.eth") for provider node highlighting
            const provider = String(e.tool ?? "");
            if (provider) activeTools.add(provider);
            // Add specific tool name (e.g. "scan-yields") for tool node highlighting
            const toolName = String(e.toolName ?? (e.subtask as { tool?: string })?.tool ?? "");
            if (toolName) {
                activeTools.add(toolName);
                const method = String(e.method ?? (e.subtask as { description?: string })?.description ?? "");
                if (method) toolActions.set(toolName, method.length > 30 ? method.slice(0, 30) + "…" : method);
            }
        }
    }
    const isProcessing = events.some((e) => e.type === "task_created" && !events.some((e2) => e2.type === "task_completed"));

    return (
        <div className="h-screen flex flex-col bg-neo-bg overflow-hidden">
            <Navbar status={status} eventCount={events.length} />
            <PaymentTicker events={events} />

            {/* Payment approval modal */}
            {pendingPayment && (
                <PaymentApproval
                    payment={pendingPayment}
                    onApprove={approvePayment}
                    onReject={rejectPayment}
                />
            )}

            <main className="flex-1 border-t-4 border-black min-h-0">
                <Group orientation="horizontal" className="h-full">
                    {/* Chat History — Collapsible */}
                    <Panel
                        defaultSize="15%"
                        minSize="8%"
                        maxSize="25%"
                        collapsible
                        collapsedSize="0%"
                        panelRef={historyPanelRef}
                        onResize={() => setHistoryCollapsed(historyPanelRef.current?.isCollapsed() ?? false)}
                    >
                        <ChatHistory
                            chats={chats}
                            activeChatId={selectedChatId}
                            onSelectChat={handleSelectChat}
                            onNewChat={handleNewChat}
                            onDeleteChat={handleDeleteChat}
                            loading={chatsLoading}
                        />
                    </Panel>
                    <Separator className="w-1 bg-black hover:bg-neo-accent transition-colors relative group">
                        <button
                            onClick={() => historyCollapsed ? historyPanelRef.current?.expand() : historyPanelRef.current?.collapse()}
                            className="absolute top-1/2 -translate-y-1/2 -left-3 z-10 w-5 h-8 bg-black text-white text-xs flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neo-accent"
                            title={historyCollapsed ? "Show history" : "Hide history"}
                        >
                            {historyCollapsed ? "›" : "‹"}
                        </button>
                    </Separator>

                    {/* Chat Panel */}
                    <Panel defaultSize="30%" minSize="20%">
                        <ChatPanel
                            events={displayEvents}
                            onSendGoal={sendGoal}
                            status={status}
                            walletConnected={!!walletAddress}
                            wrongChain={wrongChain}
                            onSwitchChain={() => switchChain({ chainId: baseSepolia.id })}
                            onToggleHistory={() => historyCollapsed ? historyPanelRef.current?.expand() : historyPanelRef.current?.collapse()}
                            historyCollapsed={historyCollapsed}
                        />
                    </Panel>
                    <Separator className="w-1 bg-black hover:bg-neo-accent transition-colors" />

                    {/* Center — Network + Activity */}
                    <Panel defaultSize="35%" minSize="20%">
                        <Group orientation="vertical" className="h-full">
                            <Panel defaultSize="60%" minSize="20%">
                                <div className="h-full overflow-hidden">
                                    <NetworkGraph activeTools={activeTools} toolActions={toolActions} />
                                </div>
                            </Panel>
                            <Separator className="h-1 bg-black hover:bg-neo-accent transition-colors relative group">
                                <button
                                    onClick={() => activityCollapsed ? activityPanelRef.current?.expand() : activityPanelRef.current?.collapse()}
                                    className="absolute left-1/2 -translate-x-1/2 -top-3 z-10 h-5 w-8 bg-black text-white text-xs flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neo-accent"
                                    title={activityCollapsed ? "Show activity" : "Hide activity"}
                                >
                                    {activityCollapsed ? "▼" : "▲"}
                                </button>
                            </Separator>
                            <Panel
                                defaultSize="40%"
                                minSize="15%"
                                collapsible
                                collapsedSize="0%"
                                panelRef={activityPanelRef}
                                onResize={() => setActivityCollapsed(activityPanelRef.current?.isCollapsed() ?? false)}
                            >
                                <div className="h-full overflow-y-auto">
                                    <ActivityFeed events={events} />
                                </div>
                            </Panel>
                        </Group>
                    </Panel>
                    <Separator className="w-1 bg-black hover:bg-neo-accent transition-colors relative group">
                        <button
                            onClick={() => toolsCollapsed ? toolsPanelRef.current?.expand() : toolsPanelRef.current?.collapse()}
                            className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-5 h-8 bg-black text-white text-xs flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neo-accent"
                            title={toolsCollapsed ? "Show tools" : "Hide tools"}
                        >
                            {toolsCollapsed ? "‹" : "›"}
                        </button>
                    </Separator>

                    {/* Right — Tool Registry — Collapsible */}
                    <Panel
                        defaultSize="20%"
                        minSize="10%"
                        collapsible
                        collapsedSize="0%"
                        panelRef={toolsPanelRef}
                        onResize={() => setToolsCollapsed(toolsPanelRef.current?.isCollapsed() ?? false)}
                    >
                        <ToolRegistry />
                    </Panel>
                </Group>
            </main>
        </div>
    );
}
