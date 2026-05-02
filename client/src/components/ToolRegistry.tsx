"use client";

import { useEffect, useState } from "react";

interface RegisteredTool {
    ensName: string;
    capabilities: string[];
    pricePerCall: string;
    isActive: boolean;
}

// On-chain registry data (fetched from orchestrator API or fallback to known state)
const FALLBACK_REGISTRY: RegisteredTool[] = [
    { ensName: "orchestrator.agentmesh.eth", capabilities: ["task-planning", "tool-discovery", "orchestration"], pricePerCall: "0", isActive: true },
    { ensName: "researcher.agentmesh.eth", capabilities: ["defi-research", "scan-yields", "token-info", "protocol-stats"], pricePerCall: "0.01", isActive: true },
    { ensName: "analyst.agentmesh.eth", capabilities: ["risk-analysis", "risk-assess", "contract-audit"], pricePerCall: "0.01", isActive: true },
    { ensName: "executor.agentmesh.eth", capabilities: ["execution", "execute-swap", "execute-deposit", "check-balance"], pricePerCall: "0.02", isActive: true },
    { ensName: "gas-optimizer.agentmesh.eth", capabilities: ["gas-prediction", "fee-estimation"], pricePerCall: "0.005", isActive: true },
];

const ROLE_ICONS: Record<string, string> = {
    "orchestrator": "🧠",
    "researcher": "🔍",
    "analyst": "⚠️",
    "executor": "🔧",
    "gas-optimizer": "⛽",
};

const ROLE_COLORS: Record<string, string> = {
    "orchestrator": "bg-red-100 border-red-400",
    "researcher": "bg-blue-100 border-blue-400",
    "analyst": "bg-yellow-100 border-yellow-400",
    "executor": "bg-purple-100 border-purple-400",
    "gas-optimizer": "bg-green-100 border-green-400",
};

export function ToolRegistry() {
    const [tools, setTools] = useState<RegisteredTool[]>(FALLBACK_REGISTRY);
    const [loading, setLoading] = useState(false);

    // Try to fetch live registry from orchestrator API
    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        setLoading(true);
        fetch(`${API_URL}/registry`)
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setTools(data);
                }
            })
            .catch(() => {
                // Use fallback — orchestrator may not be running
            })
            .finally(() => setLoading(false));
    }, []);

    const getName = (ensName: string) => ensName.split(".")[0];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b-4 border-black bg-neo-white flex items-center justify-between shrink-0">
                <h2 className="text-sm font-black uppercase tracking-wider">
                    TOOL REGISTRY
                    <span className="ml-2 bg-green-400 border-2 border-black px-2 py-0.5 text-[10px] font-black">ON-CHAIN</span>
                </h2>
                <div className="flex items-center gap-2">
                    <span className="mono text-xs font-black">{tools.length} TOOLS</span>
                    {loading && <span className="text-[10px] animate-pulse">SYNCING...</span>}
                </div>
            </div>

            {/* Registry info bar */}
            <div className="px-4 py-2 bg-neo-muted border-b-2 border-black text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>AgentRegistry • 0G Chain Testnet</span>
                <span className="mono opacity-60">0x0B05...da28</span>
            </div>

            {/* Architecture indicator */}
            <div className="px-4 py-2 border-b-2 border-black bg-neo-bg flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <span className="text-sm">🧠</span>
                    <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5">1 Brain</span>
                    <span className="text-[9px] opacity-50 ml-1">0G Compute</span>
                </div>
                <span className="text-[9px] font-black">+</span>
                <div className="flex items-center gap-1">
                    <span className="text-sm">🔧</span>
                    <span className="text-[9px] font-black uppercase bg-neo-white border border-black px-1.5 py-0.5">{tools.length - 1} Tools</span>
                    <span className="text-[9px] opacity-50 ml-1">No LLM</span>
                </div>
            </div>

            {/* Tool list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {tools.map((tool) => {
                    const name = getName(tool.ensName);
                    const icon = ROLE_ICONS[name] ?? "📦";
                    const colorClass = ROLE_COLORS[name] ?? "bg-gray-100 border-gray-400";
                    const isOrchestrator = name === "orchestrator";

                    return (
                        <div
                            key={tool.ensName}
                            className={`border-3 border-black p-3 shadow-[3px_3px_0px_0px_#000] ${colorClass}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm uppercase">{name}</span>
                                            {isOrchestrator && (
                                                <span className="bg-black text-white px-1.5 py-0.5 text-[9px] font-black">BRAIN</span>
                                            )}
                                            {!isOrchestrator && (
                                                <span className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-black">TOOL</span>
                                            )}
                                        </div>
                                        <div className="mono text-[10px] opacity-60 mt-0.5">{tool.ensName}</div>
                                    </div>
                                </div>

                                {/* Status + Price */}
                                <div className="text-right">
                                    <div className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${tool.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                        <span className="text-[10px] font-bold uppercase">
                                            {tool.isActive ? "LIVE" : "OFF"}
                                        </span>
                                    </div>
                                    {!isOrchestrator && (
                                        <div className="mono text-[10px] font-bold mt-1">
                                            {Number(tool.pricePerCall) > 0 ? `${tool.pricePerCall} USDC` : "FREE"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Capabilities */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {tool.capabilities.map((cap) => (
                                    <span
                                        key={cap}
                                        className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                    >
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer — marketplace CTA */}
            <div className="px-4 py-3 border-t-4 border-black bg-neo-white shrink-0">
                <div className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Open Marketplace — Anyone Can Register
                    </div>
                    <div className="mono text-[9px] mt-1 opacity-40">
                        Deploy MCP service → Register on-chain → Get discovered → Earn USDC
                    </div>
                </div>
            </div>
        </div>
    );
}
