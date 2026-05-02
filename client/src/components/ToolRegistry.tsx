"use client";

import { useCatalog, type CatalogProvider } from "@/hooks/useCatalog";

const ROLE_ICONS: Record<string, string> = {
    "agentmesh": "🧠",
    "researcher": "🔍",
    "analyst": "⚠️",
    "executor": "🔧",
    "gas-optimizer": "⛽",
    "risk analyst": "⚠️",
    "gas optimizer": "⛽",
};

const ROLE_COLORS: Record<string, string> = {
    "agentmesh": "bg-indigo-100 border-indigo-400",
    "researcher": "bg-blue-100 border-blue-400",
    "analyst": "bg-yellow-100 border-yellow-400",
    "executor": "bg-purple-100 border-purple-400",
    "gas-optimizer": "bg-green-100 border-green-400",
    "risk analyst": "bg-yellow-100 border-yellow-400",
    "gas optimizer": "bg-green-100 border-green-400",
};

const STATUS_DOT: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    degraded: "bg-yellow-500",
};

export function ToolRegistry() {
    const { providers, tools, isLoading } = useCatalog();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b-4 border-black bg-neo-white flex items-center justify-between shrink-0">
                <h2 className="text-sm font-black uppercase tracking-wider">
                    MCP PROVIDERS
                    <span className="ml-2 bg-green-400 border-2 border-black px-2 py-0.5 text-[10px] font-black">LIVE</span>
                </h2>
                <div className="flex items-center gap-2">
                    <span className="mono text-xs font-black">{tools.length} TOOLS</span>
                    {isLoading && <span className="text-[10px] animate-pulse">SYNCING...</span>}
                </div>
            </div>

            {/* Registry info bar */}
            <div className="px-4 py-2 bg-neo-muted border-b-2 border-black text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>AgentRegistry • 0G Chain Testnet</span>
                <span className="mono opacity-60">0x632B...cbDd</span>
            </div>

            {/* Architecture indicator */}
            <div className="px-4 py-2 border-b-2 border-black bg-neo-bg flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <span className="text-sm">📦</span>
                    <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5">{providers.length} Providers</span>
                </div>
                <span className="text-[9px] font-black">→</span>
                <div className="flex items-center gap-1">
                    <span className="text-sm">⚡</span>
                    <span className="text-[9px] font-black uppercase bg-neo-white border border-black px-1.5 py-0.5">{tools.length} Tools</span>
                    <span className="text-[9px] opacity-50 ml-1">x402</span>
                </div>
            </div>

            {/* Provider list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {providers.map((provider) => (
                    <ProviderRow key={provider.ensName} provider={provider} />
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t-4 border-black bg-neo-white shrink-0">
                <div className="text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                        Open MCP Marketplace — Anyone Can Publish
                    </div>
                    <div className="mono text-[9px] mt-1 opacity-40">
                        Deploy MCP Server → Register on-chain → Tools auto-discovered → Earn via x402
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProviderRow({ provider }: { provider: CatalogProvider }) {
    const nameKey = provider.name.toLowerCase();
    const icon = ROLE_ICONS[nameKey] ?? "📦";
    const colorClass = ROLE_COLORS[nameKey] ?? "bg-gray-100 border-gray-400";
    const statusDot = STATUS_DOT[provider.status] ?? STATUS_DOT.offline;

    return (
        <div className={`border-3 border-black p-3 shadow-[3px_3px_0px_0px_#000] ${colorClass}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-sm uppercase">{provider.name}</span>
                        </div>
                        <div className="mono text-[10px] opacity-60 mt-0.5">{provider.ensName}</div>
                    </div>
                </div>

                {/* Status + Tool count */}
                <div className="text-right">
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-[10px] font-bold uppercase">
                            {provider.status}
                        </span>
                    </div>
                    <div className="mono text-[10px] font-bold mt-1">
                        {provider.tools.length} tool{provider.tools.length !== 1 ? "s" : ""}
                    </div>
                </div>
            </div>

            {/* Tools preview */}
            {provider.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {provider.tools.map((tool) => (
                        <span
                            key={tool.name}
                            className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold"
                        >
                            ⚡ {tool.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Categories */}
            {provider.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-black/10">
                    {provider.categories.slice(0, 3).map((cap) => (
                        <span
                            key={cap}
                            className="bg-white/50 border border-black/30 px-1.5 py-0.5 text-[9px] font-bold uppercase opacity-60"
                        >
                            {cap}
                        </span>
                    ))}
                    {provider.categories.length > 3 && (
                        <span className="text-[9px] opacity-40 font-bold">+{provider.categories.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}
