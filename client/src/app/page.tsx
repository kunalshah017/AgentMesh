"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { StickerLayer } from "@/components/StickerLayer";

const ShapeGrid = dynamic(() => import("@/components/ShapeGrid"), { ssr: false });

const MCP_TOOLS = [
  { name: "scan-yields", price: "0.02", description: "Scan DeFi protocols for yield opportunities", category: "research" },
  { name: "token-info", price: "0.01", description: "Get token price and market data from CoinGecko", category: "research" },
  { name: "protocol-stats", price: "0.01", description: "Get protocol TVL and statistics from DeFi Llama", category: "research" },
  { name: "risk-assess", price: "0.03", description: "Assess risk of a DeFi protocol", category: "risk" },
  { name: "contract-audit", price: "0.05", description: "Check smart contract audit status", category: "risk" },
  { name: "execute-swap", price: "0.05", description: "Execute a token swap via Uniswap", category: "execution" },
  { name: "execute-deposit", price: "0.05", description: "Deposit tokens into a DeFi protocol", category: "execution" },
  { name: "check-balance", price: "0.01", description: "Check wallet token balances on-chain", category: "execution" },
  { name: "pay-with-any-token", price: "0.02", description: "Auto-swap any token to USDC for x402 payment", category: "execution" },
];

const CATEGORY_COLORS: Record<string, string> = {
  research: "bg-blue-100 border-blue-400",
  risk: "bg-yellow-100 border-yellow-400",
  execution: "bg-purple-100 border-purple-400",
};

const SPONSORS = [
  { name: "0G", layers: "Compute + Storage + Chain", what: "LLM inference, KV storage, smart contracts", color: "bg-black text-white" },
  { name: "Gensyn AXL", layers: "P2P Mesh", what: "Encrypted agent communication, MCP routing", color: "bg-green-600 text-white" },
  { name: "Uniswap", layers: "Trading API", what: "Real-time swap quotes, pay-with-any-token", color: "bg-pink-500 text-white" },
  { name: "KeeperHub", layers: "MCP Execution", what: "DeFi workflows, reputation on 0G Chain", color: "bg-blue-600 text-white" },
  { name: "ENS", layers: "Identity", what: "Agent discovery by capability", color: "bg-sky-400 text-black" },
];

const STATS = [
  { label: "MCP Tools", value: "9", sub: "discoverable" },
  { label: "Providers", value: "1", sub: "on-chain" },
  { label: "Reputation Txs", value: "4", sub: "verified" },
  { label: "Avg Response", value: "<1s", sub: "per call" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-neo-bg">
      {/* Nav */}
      <Navbar />

      {/* Draggable Stickers — freely movable across entire page */}
      <StickerLayer
        stickers={[
          { src: "/mascots/orchestrator-mascot.png", width: 280, rotate: -2, position: { xPercent: 72, yPercent: 4 } },
          { src: "/mascots/explore-page-mascot.png", width: 110, rotate: 3, position: { xPercent: 85, yPercent: 25 } },
          { src: "/mascots/achitecture-mascot.png", width: 200, rotate: -1, position: { xPercent: 78, yPercent: 38 } },
          { src: "/mascots/publish-page-mascot.png", width: 130, rotate: 2, position: { xPercent: 82, yPercent: 80 } },
        ]}
      />

      {/* Hero */}
      <section className="relative border-b-4 border-black px-6 py-16 md:py-24 bg-neo-white overflow-hidden">
        {/* Animated shape grid background */}
        <div className="absolute inset-0 opacity-[0.15]">
          <ShapeGrid
            speed={0.3}
            squareSize={48}
            direction="diagonal"
            borderColor="#000000"
            hoverFillColor="#FF6B6B"
            shape="square"
            hoverTrailAmount={6}
          />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="bg-neo-secondary border-4 border-black px-3 py-1 inline-block shadow-[3px_3px_0px_0px_#000] mb-6 -rotate-1">
            <span className="text-xs font-black uppercase">ETHGlobal Open Agents 2026</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase leading-tight tracking-tight">
            The App Store for<br />
            <span className="bg-neo-accent px-2 inline-block -rotate-1 border-4 border-black shadow-[4px_4px_0px_0px_#000]">AI Tools</span>
            {" "}— Decentralized
          </h2>
          <p className="text-lg md:text-xl mt-6 max-w-3xl font-medium leading-relaxed">
            Ship a tool. Get paid per call. No GPU, no gatekeepers — just code and USDC.
          </p>

          {/* Flow diagram */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {["Publish Tool", "→", "Register On-Chain", "→", "Get Discovered", "→", "Earn USDC"].map((step, i) => (
              step === "→" ? (
                <span key={i} className="text-2xl font-black">→</span>
              ) : (
                <div key={i} className="bg-neo-muted border-3 border-black px-4 py-2 shadow-[3px_3px_0px_0px_#000] font-black text-sm uppercase">
                  {step}
                </div>
              )
            ))}
          </div>

          <div className="mt-10 flex gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="bg-neo-accent border-4 border-black px-6 py-3 text-lg font-black uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Try the Dashboard
            </Link>
            <a
              href="https://github.com/kunalshah017/AgentMesh"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neo-white border-4 border-black px-6 py-3 text-lg font-black uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              GitHub ↗
            </a>
          </div>

        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b-4 border-black bg-black text-white px-6 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-black">{stat.value}</div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">{stat.label}</div>
              <div className="text-[10px] font-bold uppercase opacity-40">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Payments Banner */}
      <section className="border-b-4 border-black bg-neo-secondary px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">x402 LIVE</span>
            <span className="text-sm font-black">Real USDC payments settled on Base Sepolia</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <a href="https://sepolia.basescan.org/tx/0x68eb13ba381adee4ccce928461f4f4b0116f460f505b4d1c6968a4868e56927c" target="_blank" rel="noopener noreferrer" className="hover:underline">
              0.01 USDC → token-info ↗
            </a>
            <a href="https://sepolia.basescan.org/tx/0x76d2f9047e3d96066fb975a0a15e549cdd32352171ab42d0ce089db96d256551" target="_blank" rel="noopener noreferrer" className="hover:underline">
              0.05 USDC → execute-swap ↗
            </a>
          </div>
        </div>
      </section>

      {/* On-Chain Registry Banner */}
      <section className="border-b-4 border-black bg-neo-muted px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">ENS ON-CHAIN</span>
            <span className="text-sm font-black">AgentRegistry deployed on 0G Chain testnet</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <a href="https://chainscan-newton.0g.ai/address/0x617eDCC3068774492a20E2B5d23f155e0CCA73Db" target="_blank" rel="noopener noreferrer" className="hover:underline">
              AgentRegistry ↗
            </a>
            <a href="https://chainscan-newton.0g.ai/address/0xc9EF38Ba33BcFD35b04c8255564473B656F099aB" target="_blank" rel="noopener noreferrer" className="hover:underline">
              ReputationTracker ↗
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b-4 border-black px-6 py-16 bg-neo-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-6 mb-10">
            <h3 className="text-3xl font-black uppercase">How It Works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Deploy & Register", desc: "Build a lightweight MCP tool (no GPU needed). Register it on-chain with capabilities and pricing. Done in 5 minutes.", icon: "📦" },
              { step: "2", title: "Get Discovered", desc: "When a user submits a task, the Orchestrator queries the on-chain registry and discovers YOUR tool by capability match.", icon: "🔍" },
              { step: "3", title: "Earn Per Call", desc: "Every time your tool is used, you earn USDC via x402 micropayments. Reputation builds on-chain automatically.", icon: "💰" },
            ].map((item) => (
              <div key={item.step} className="border-4 border-black p-6 shadow-[6px_6px_0px_0px_#000] bg-neo-bg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-neo-accent border-3 border-black w-10 h-10 flex items-center justify-center font-black text-lg">
                    {item.step}
                  </div>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h4 className="font-black text-lg uppercase mb-2">{item.title}</h4>
                <p className="text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-b-4 border-black px-6 py-16 bg-neo-muted">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
            <div className="flex-1">
              <h3 className="text-3xl font-black uppercase mb-4">Architecture: 1 Brain + N Tools</h3>
              <p className="text-sm font-medium max-w-2xl">
                Only the Orchestrator runs AI (0G Compute). Tool providers are lightweight deterministic functions —
                no GPU, no LLM, just input → output. Anyone can host a tool on a $5 VPS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Brain */}
            <div className="border-4 border-black p-5 bg-red-100 shadow-[5px_5px_0px_0px_#000]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🧠</span>
                <div>
                  <div className="font-black uppercase">Orchestrator</div>
                  <div className="text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 inline-block">BRAIN — 0G Compute</div>
                </div>
              </div>
              <p className="text-sm">Plans tasks, discovers tools, coordinates execution, handles payments. The ONLY node that needs AI.</p>
            </div>

            {/* Tools */}
            <div className="border-4 border-black p-5 bg-neo-white shadow-[5px_5px_0px_0px_#000]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔧</span>
                <div>
                  <div className="font-black uppercase">Tool Providers (N)</div>
                  <div className="text-[10px] font-bold uppercase bg-neo-muted border border-black px-2 py-0.5 inline-block">NO LLM — Deterministic</div>
                </div>
              </div>
              <p className="text-sm">Pure MCP functions: DeFi research, swaps, gas prediction, risk analysis. Fast, cheap, anyone can deploy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Tool Marketplace */}
      <section className="border-b-4 border-black px-6 py-16 bg-neo-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-3xl font-black uppercase">MCP Tool Marketplace</h3>
            <div className="bg-green-400 border-3 border-black px-3 py-1 shadow-[3px_3px_0px_0px_#000]">
              <span className="text-xs font-black uppercase">x402 Priced</span>
            </div>
          </div>
          <p className="text-sm font-medium mb-8 max-w-2xl">
            Every tool is an MCP endpoint. Prices are discovered at runtime via x402 (HTTP 402).
            The Orchestrator calls <code className="bg-neo-bg px-1 border border-black text-xs">tools/list</code> on each provider to discover available tools.
          </p>

          {/* Provider card */}
          <div className="border-4 border-black p-5 shadow-[6px_6px_0px_0px_#000] bg-neo-bg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="font-black uppercase text-lg">AgentMesh</div>
                  <div className="mono text-[10px] opacity-60">agent-mesh.eth</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-400 border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase">ONLINE</span>
                <span className="bg-neo-muted border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase">9 TOOLS</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {["defi-research", "yield-scanning", "risk-analysis", "execution", "token-swaps"].map((cat) => (
                <span key={cat} className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Tools grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${CATEGORY_COLORS[tool.category]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">{tool.name}</span>
                  <span className="bg-green-100 border border-green-400 px-2 py-0.5 text-[9px] font-black text-green-700">
                    {tool.price} USDC
                  </span>
                </div>
                <div className="text-xs opacity-80 leading-relaxed">{tool.description}</div>
              </div>
            ))}

            {/* Publish CTA card */}
            <Link href="/publish" className="border-4 border-dashed border-black p-4 flex flex-col items-center justify-center text-center bg-neo-bg opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-3xl mb-2">➕</span>
              <span className="font-black text-sm uppercase">Your Tool Here</span>
              <span className="text-[10px] mt-1 opacity-60">Deploy → Register → Earn</span>
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/explore" className="text-sm font-black uppercase underline hover:no-underline">
              View full catalog on /explore →
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="border-b-4 border-black px-6 py-16 bg-neo-bg">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl font-black uppercase mb-8">5 Sponsor Integrations — All Live</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPONSORS.map((s) => (
              <div key={s.name} className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${s.color}`}>
                <div className="font-black text-lg uppercase">{s.name}</div>
                <div className="text-xs font-bold uppercase opacity-70 mt-1">{s.layers}</div>
                <div className="text-sm mt-2 opacity-90">{s.what}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Publish Your Tool */}
      <section className="border-b-4 border-black px-6 py-16 bg-neo-accent">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-6 mb-6">
            <h3 className="text-3xl font-black uppercase">Publish Your Own Tool</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-4 border-black p-5 bg-neo-white shadow-[4px_4px_0px_0px_#000]">
              <div className="font-black text-lg mb-2">1. Build</div>
              <pre className="text-[11px] bg-black text-green-400 p-3 overflow-x-auto border-2 border-black">
                {`export async function myTool(
  input: string
) {
  return { result: "..." };
}`}
              </pre>
            </div>
            <div className="border-4 border-black p-5 bg-neo-white shadow-[4px_4px_0px_0px_#000]">
              <div className="font-black text-lg mb-2">2. Register</div>
              <pre className="text-[11px] bg-black text-green-400 p-3 overflow-x-auto border-2 border-black">
                {`bun run register-tool.ts \\
  --name "my-tool" \\
  --endpoint "https://..." \\
  --categories "defi,risk"`}
              </pre>
            </div>
            <div className="border-4 border-black p-5 bg-neo-white shadow-[4px_4px_0px_0px_#000]">
              <div className="font-black text-lg mb-2">3. Earn</div>
              <div className="text-sm leading-relaxed">
                Your tool appears in the registry. When a task matches your capabilities, the Orchestrator calls you and pays USDC per call.
              </div>
              <div className="mt-3 bg-green-100 border-2 border-black p-2 text-center">
                <span className="font-black text-lg">💸 0.01 USDC/call</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-b-4 border-black px-6 py-12 bg-neo-white">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-black uppercase mb-6">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {[
              "TypeScript", "Bun", "Next.js 15", "React 19", "Tailwind v4",
              "ethers.js", "viem", "0G SDK", "AXL P2P", "Solidity",
              "Express MCP", "EIP-712", "x402", "Turborepo",
            ].map((tech) => (
              <span key={tech} className="border-3 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] bg-neo-bg">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-black text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-black text-lg uppercase">AgentMesh</div>
            <div className="text-xs opacity-60 mt-1">Decentralized MCP Tool Marketplace • ETHGlobal Open Agents 2026</div>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/kunalshah017/AgentMesh" target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline hover:no-underline">
              GitHub
            </a>
            <Link href="/explore" className="text-sm font-bold underline hover:no-underline">
              Explore
            </Link>
            <Link href="/publish" className="text-sm font-bold underline hover:no-underline">
              Publish
            </Link>
            <Link href="/dashboard" className="text-sm font-bold underline hover:no-underline">
              Dashboard
            </Link>
          </div>
          <div className="text-xs opacity-40">
            Built by @kunalshah017
          </div>
        </div>
      </footer>
    </div>
  );
}
