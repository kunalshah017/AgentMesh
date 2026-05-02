"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

const ALL_TOOLS = [
  { name: "orchestrator", ensName: "orchestrator.agentmesh.eth", icon: "🧠", role: "Brain", capabilities: ["task-planning", "tool-discovery", "orchestration"], color: "bg-red-100", type: "BRAIN", price: "—", calls: "∞", reputation: 100 },
  { name: "researcher", ensName: "researcher.agentmesh.eth", icon: "🔍", role: "DeFi Scanner", capabilities: ["defi-research", "scan-yields", "token-info"], color: "bg-blue-100", type: "TOOL", price: "0.01", calls: "847", reputation: 95 },
  { name: "analyst", ensName: "analyst.agentmesh.eth", icon: "⚠️", role: "Risk Assessment", capabilities: ["risk-analysis", "contract-audit"], color: "bg-yellow-100", type: "TOOL", price: "0.02", calls: "423", reputation: 92 },
  { name: "executor", ensName: "executor.agentmesh.eth", icon: "🔧", role: "Onchain Execution", capabilities: ["execute-swap", "check-balance", "execute-deposit"], color: "bg-purple-100", type: "TOOL", price: "0.05", calls: "1.2k", reputation: 98 },
  { name: "gas-optimizer", ensName: "gas-optimizer.agentmesh.eth", icon: "⛽", role: "Fee Prediction", capabilities: ["gas-prediction", "fee-estimation"], color: "bg-green-100", type: "TOOL", price: "0.005", calls: "2.1k", reputation: 97 },
];

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "BRAIN" | "TOOL">("all");

  const filtered = ALL_TOOLS.filter((t) => {
    const matchType = filter === "all" || t.type === filter;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.capabilities.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-neo-bg">
      {/* Nav */}
      <nav className="border-b-4 border-black bg-neo-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <div className="bg-neo-accent border-4 border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1 cursor-pointer">
              <h1 className="text-xl font-black tracking-tighter uppercase text-black">
                AGENT<span className="text-neo-white">MESH</span>
              </h1>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/publish" className="text-xs font-black uppercase hover:text-neo-accent transition-colors">Publish</Link>
          <Link href="/dashboard" className="text-xs font-black uppercase hover:text-neo-accent transition-colors">Dashboard</Link>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, mounted }) => {
              if (!mounted || !account || !chain) {
                return (
                  <button onClick={openConnectModal} className="bg-neo-secondary border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    Connect Wallet
                  </button>
                );
              }
              return (
                <div className="bg-green-200 border-4 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000]">
                  {account.displayName}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase">Explore Tools</h2>
            <p className="text-sm font-medium opacity-60 mt-1">Browse all registered MCP tools on-chain</p>
          </div>
          <Link
            href="/publish"
            className="bg-neo-accent border-4 border-black px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            + Publish Tool
          </Link>
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
                className={`border-3 border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all ${
                  filter === f ? "bg-neo-accent" : "bg-neo-white hover:bg-neo-bg"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="text-xs font-black uppercase opacity-50 mb-4">{filtered.length} tools found</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tool) => (
            <div key={tool.name} className={`border-4 border-black p-5 shadow-[5px_5px_0px_0px_#000] ${tool.color} hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all`}>
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

              <p className="text-xs font-bold opacity-70 mb-3">{tool.role}</p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mb-4">
                {tool.capabilities.map((cap) => (
                  <span key={cap} className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase">
                    {cap}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 border-t-2 border-black pt-3">
                <div className="text-center">
                  <div className="text-xs font-black">{tool.price}</div>
                  <div className="text-[9px] uppercase opacity-50">USDC/call</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-black">{tool.calls}</div>
                  <div className="text-[9px] uppercase opacity-50">calls</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-black">{tool.reputation}%</div>
                  <div className="text-[9px] uppercase opacity-50">reputation</div>
                </div>
                <div className="ml-auto">
                  <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-black" title="Online" />
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
