"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useState } from "react";
import { useRegistryAgents } from "@/hooks/useRegistry";
import { formatEther } from "viem";

const ICONS: Record<string, string> = {
    orchestrator: "🧠",
    researcher: "🔍",
    analyst: "⚠️",
    executor: "🔧",
    "gas-optimizer": "⛽",
};

const COLORS: Record<string, string> = {
    orchestrator: "bg-red-100",
    researcher: "bg-blue-100",
    analyst: "bg-yellow-100",
    executor: "bg-purple-100",
    "gas-optimizer": "bg-green-100",
};

function getToolName(ensName: string): string {
    return ensName.split(".")[0] ?? ensName;
}

function isOrchestrator(capabilities: string[]): boolean {
    return capabilities.some((c) => c.includes("orchestration") || c.includes("task-planning"));
}

export default function ExplorePage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "BRAIN" | "TOOL">("all");
    const { agents, isLoading } = useRegistryAgents();

    const displayAgents = agents.map((a) => {
        const name = getToolName(a.ensName);
        const type = isOrchestrator(a.capabilities) ? "BRAIN" : "TOOL";
        return { ...a, name, type, icon: ICONS[name] ?? "🔧", color: COLORS[name] ?? "bg-gray-100" };
    });

    const filtered = displayAgents.filter((t) => {
        const matchType = filter === "all" || t.type === filter;
        const matchSearch =
            !search ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.capabilities.some((c: string) => c.toLowerCase().includes(search.toLowerCase()));
        return matchType && matchSearch;
    });

    return (
        <div className="min-h-screen bg-neo-bg">
            {/* Nav */}
            <Navbar />

            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase">Explore Tools</h2>
                        <p className="text-sm font-medium opacity-60 mt-1">
                            {isLoading ? "Loading from 0G Chain..." : `${agents.length} tools registered on-chain`}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="bg-green-400 border-3 border-black px-3 py-1 shadow-[2px_2px_0px_0px_#000]">
                            <span className="text-[10px] font-black uppercase">⛓️ Live On-Chain</span>
                        </div>
                        <Link
                            href="/publish"
                            className="bg-neo-accent border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            + Publish Tool
                        </Link>
                    </div>
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-8">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or capability..."
                        className="flex-1 border-4 border-black p-3 text-sm font-bold bg-neo-white focus:outline-none focus:border-neo-accent"
                    />
                    <div className="flex gap-2">
                        {(["all", "BRAIN", "TOOL"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`border-3 border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all ${filter === f ? "bg-neo-accent" : "bg-neo-white hover:bg-neo-bg"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results */}
                <div className="text-xs font-black uppercase opacity-50 mb-4">{filtered.length} tools found</div>

                {isLoading && (
                    <div className="border-4 border-black p-12 text-center bg-neo-white shadow-[5px_5px_0px_0px_#000]">
                        <div className="animate-pulse">
                            <span className="text-3xl block mb-3">⛓️</span>
                            <p className="font-black uppercase">Reading from 0G Chain...</p>
                            <p className="text-xs opacity-50 mt-1">Fetching AgentRegistry + ReputationTracker</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((tool) => (
                        <div key={tool.id} className={`border-4 border-black p-5 shadow-[5px_5px_0px_0px_#000] ${tool.color} hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{tool.icon}</span>
                                    <div>
                                        <span className="font-black uppercase text-sm block">{tool.name}</span>
                                        <span className="text-[10px] opacity-50 font-mono">{tool.ensName}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${tool.type === "BRAIN" ? "bg-black text-white" : "bg-white border border-black"}`}>
                                    {tool.type}
                                </span>
                            </div>

                            {/* Owner */}
                            <div className="text-[10px] font-mono opacity-40 mb-2">
                                owner: {tool.owner.slice(0, 6)}...{tool.owner.slice(-4)}
                            </div>

                            {/* Capabilities */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {tool.capabilities.map((cap: string) => (
                                    <span key={cap} className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                        {cap}
                                    </span>
                                ))}
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-4 border-t-2 border-black pt-3">
                                <div className="text-center">
                                    <div className="text-xs font-black">
                                        {tool.pricePerCall === 0n ? "Free" : `${formatEther(tool.pricePerCall)}`}
                                    </div>
                                    <div className="text-[9px] uppercase opacity-50">price/call</div>
                                </div>
                                {tool.reputation && (
                                    <>
                                        <div className="text-center">
                                            <div className="text-xs font-black">{Number(tool.reputation.tasksCompleted)}</div>
                                            <div className="text-[9px] uppercase opacity-50">tasks</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-black">{Math.round(tool.reputation.successRate)}%</div>
                                            <div className="text-[9px] uppercase opacity-50">success</div>
                                        </div>
                                        <a
                                            href={`https://chainscan-newton.0g.ai/address/0x2B8C2D313300122e0Fd90a3B7F4e3f0Bb05E2Cf4`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-bold text-blue-600 hover:underline"
                                        >
                                            ⛓️ Verified
                                        </a>
                                    </>
                                )}
                                <div className="ml-auto">
                                    <div className={`w-3 h-3 rounded-full border-2 border-black ${tool.active ? "bg-green-500" : "bg-red-500"}`} title={tool.active ? "Active" : "Inactive"} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="border-4 border-dashed border-black p-12 text-center bg-neo-white">
                        <span className="text-3xl block mb-3">🔍</span>
                        <p className="font-black uppercase">No tools found</p>
                        <p className="text-xs opacity-50 mt-1">Try a different search or filter</p>
                    </div>
                )}
            </main>
        </div>
    );
}
