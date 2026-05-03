"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useState } from "react";
import { useCatalog, type CatalogProvider, type CatalogTool } from "@/hooks/useCatalog";

const PROVIDER_ICONS: Record<string, string> = {
    researcher: "🔍",
    analyst: "⚠️",
    executor: "🔧",
    "gas-optimizer": "⛽",
    "risk-analyst": "⚠️",
    "risk analyst": "⚠️",
    "gas optimizer": "⛽",
};

const PROVIDER_COLORS: Record<string, string> = {
    researcher: "border-l-blue-500",
    analyst: "border-l-yellow-500",
    executor: "border-l-purple-500",
    "gas-optimizer": "border-l-green-500",
    "risk-analyst": "border-l-yellow-500",
    "risk analyst": "border-l-yellow-500",
    "gas optimizer": "border-l-green-500",
};

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
    online: { dot: "bg-green-500", label: "Online" },
    offline: { dot: "bg-red-500", label: "Offline" },
    degraded: { dot: "bg-yellow-500", label: "Degraded" },
};

type ViewMode = "providers" | "tools";

export default function ExplorePage() {
    const [search, setSearch] = useState("");
    const [view, setView] = useState<ViewMode>("providers");
    const { providers, tools, isLoading } = useCatalog();

    // Filter providers by search
    const filteredProviders = providers.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            p.ensName.toLowerCase().includes(q) ||
            p.categories.some((c) => c.toLowerCase().includes(q)) ||
            p.tools.some((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
        );
    });

    // Filter tools by search
    const filteredTools = tools.filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.providerName.toLowerCase().includes(q)
        );
    });

    const totalTools = providers.reduce((sum, p) => sum + p.tools.length, 0);

    return (
        <div className="min-h-screen bg-neo-bg">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase">MCP Registry</h2>
                        <p className="text-sm font-medium opacity-60 mt-1">
                            {isLoading
                                ? "Discovering providers..."
                                : `${providers.length} providers · ${totalTools} tools available`}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="bg-green-400 border-3 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
                            <span className="text-[10px] font-black uppercase">⛓️ On-Chain Verified</span>
                        </div>
                        <Link
                            href="/publish"
                            className="bg-neo-accent border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            + Publish MCP Server
                        </Link>
                    </div>
                </div>

                {/* Search + View Toggle */}
                <div className="flex flex-col md:flex-row gap-3 mb-8">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search providers, tools, or categories..."
                        className="flex-1 border-4 border-black p-3 text-sm font-bold bg-neo-white focus:outline-none focus:border-neo-accent"
                    />
                    <div className="flex gap-2">
                        {(["providers", "tools"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`border-3 border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all ${view === v ? "bg-neo-accent" : "bg-neo-white hover:bg-neo-bg"}`}
                            >
                                {v === "providers" ? `📦 Providers (${providers.length})` : `🔧 Tools (${totalTools})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="border-4 border-black p-12 text-center bg-neo-white shadow-[5px_5px_0px_0px_#000]">
                        <div className="animate-pulse">
                            <span className="text-3xl block mb-3">🔍</span>
                            <p className="font-black uppercase">Discovering MCP Providers...</p>
                            <p className="text-xs opacity-50 mt-1">Calling tools/list on registered endpoints</p>
                        </div>
                    </div>
                )}

                {/* Providers View */}
                {view === "providers" && !isLoading && (
                    <div className="space-y-6">
                        <div className="text-xs font-black uppercase opacity-50 mb-2">
                            {filteredProviders.length} provider{filteredProviders.length !== 1 ? "s" : ""} found
                        </div>

                        {filteredProviders.map((provider) => (
                            <ProviderCard key={provider.ensName} provider={provider} />
                        ))}

                        {filteredProviders.length === 0 && (
                            <EmptyState message="No providers match your search" />
                        )}
                    </div>
                )}

                {/* Tools View */}
                {view === "tools" && !isLoading && (
                    <div>
                        <div className="text-xs font-black uppercase opacity-50 mb-4">
                            {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""} found
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTools.map((tool) => (
                                <ToolCard key={`${tool.providerName}/${tool.name}`} tool={tool} />
                            ))}
                        </div>

                        {filteredTools.length === 0 && (
                            <EmptyState message="No tools match your search" />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function ProviderCard({ provider }: { provider: CatalogProvider }) {
    const [expanded, setExpanded] = useState(true);
    const nameKey = provider.name.toLowerCase();
    const icon = PROVIDER_ICONS[nameKey] ?? "📦";
    const borderColor = PROVIDER_COLORS[nameKey] ?? "border-l-gray-400";
    const status = STATUS_STYLES[provider.status] ?? STATUS_STYLES.offline;

    return (
        <div className={`border-4 border-black bg-neo-white shadow-[5px_5px_0px_0px_#000] border-l-8 ${borderColor}`}>
            {/* Provider Header */}
            <div
                className="p-5 cursor-pointer hover:bg-neo-bg/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black uppercase text-lg">{provider.name}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} title={status.label} />
                            </div>
                            <span className="text-[11px] font-mono opacity-50">{provider.ensName}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-black">{provider.tools.length}</div>
                            <div className="text-[9px] uppercase opacity-50">tools</div>
                        </div>
                        <span className="text-lg opacity-40">{expanded ? "▼" : "▶"}</span>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {provider.categories.map((cat) => (
                        <span key={cat} className="bg-neo-bg border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase">
                            {cat}
                        </span>
                    ))}
                </div>

                {/* Endpoint */}
                {provider.endpoint && (
                    <div className="mt-2 text-[10px] font-mono opacity-40 truncate">
                        endpoint: {provider.endpoint}
                    </div>
                )}
            </div>

            {/* Tools List (expanded) */}
            {expanded && provider.tools.length > 0 && (
                <div className="border-t-3 border-black">
                    <div className="px-5 py-2 bg-neo-bg/50 border-b border-black/20">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-60">
                            Available Tools — Pricing via x402
                        </span>
                    </div>
                    <div className="divide-y divide-black/10">
                        {provider.tools.map((tool) => (
                            <div key={tool.name} className="px-5 py-3 hover:bg-neo-bg/20 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">⚡</span>
                                        <span className="font-bold text-sm">{tool.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-sm">
                                        {tool.price ? `${tool.price} USDC` : "x402"}
                                    </span>
                                </div>
                                <p className="text-xs opacity-60 mt-1 ml-5">{tool.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty tools state */}
            {expanded && provider.tools.length === 0 && (
                <div className="border-t-3 border-black px-5 py-4 text-center">
                    <span className="text-xs opacity-50">No tools discovered yet — provider may be offline</span>
                </div>
            )}
        </div>
    );
}

function ToolCard({ tool }: { tool: CatalogTool }) {
    const providerKey = tool.providerName.split(".")[0] ?? "";
    const icon = PROVIDER_ICONS[providerKey] ?? "📦";

    return (
        <div className="border-4 border-black p-4 bg-neo-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs">⚡</span>
                    <span className="font-black text-sm">{tool.name}</span>
                </div>
                <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded-sm">
                    {tool.price ? `${tool.price} USDC` : "x402"}
                </span>
            </div>
            <p className="text-xs opacity-60 mb-3 line-clamp-2">{tool.description}</p>
            <div className="flex items-center gap-2 border-t-2 border-black/10 pt-2">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] font-mono opacity-50 truncate">{tool.providerName}</span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="border-4 border-dashed border-black p-12 text-center bg-neo-white">
            <span className="text-3xl block mb-3">🔍</span>
            <p className="font-black uppercase">{message}</p>
            <p className="text-xs opacity-50 mt-1">Try a different search term</p>
        </div>
    );
}
