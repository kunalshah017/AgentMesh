"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Types ─── */
interface ArchNode {
    id: string;
    label: string;
    sponsor?: string;
    logo?: string;
    description: string;
    color: string;
    icon: string;
    row: number;
    col: number;
}

interface Connection {
    from: string;
    to: string;
    label?: string;
}

interface AnimatedFlow {
    id: string;
    label: string;
    steps: string[];
    color: string;
}

/* ─── Nodes: full app architecture ─── */
const NODES: ArchNode[] = [
    // Row 0: Client layer
    {
        id: "wallet",
        label: "User Wallet",
        description:
            "MetaMask/WalletConnect via wagmi. Signs EIP-712 x402 payments, approves swap transactions, connects with SIWE. Holds USDC + ETH on Base.",
        color: "bg-gray-100",
        icon: "👛",
        row: 0,
        col: 0,
    },
    {
        id: "client",
        label: "Next.js Client",
        description:
            "React frontend with wagmi wallet connection. Sends goals via WebSocket, receives real-time streaming events (tool calls, payments, transactions). Renders TransactionApproval modals for on-chain signing.",
        color: "bg-slate-100",
        icon: "🖥️",
        row: 0,
        col: 1,
    },

    // Row 1: Server
    {
        id: "server",
        label: "Express + WS Server",
        description:
            "HTTP REST + WebSocket server. Handles MCP protocol (tools/list, tools/call), manages WS connections for streaming events (goal_progress, payment_request, transaction_request). Bridges client ↔ agent.",
        color: "bg-orange-100",
        icon: "⚡",
        row: 1,
        col: 0,
    },

    // Row 2: Brain + Storage
    {
        id: "orchestrator",
        label: "Orchestrator Agent",
        sponsor: "0G",
        logo: "/sponsors/0g.png",
        description:
            "LLM-powered brain (0G Compute). Decomposes user goals into subtasks, discovers tools from registry, routes execution, handles payment/transaction approval callbacks. Single AI node in the system.",
        color: "bg-red-100",
        icon: "🧠",
        row: 2,
        col: 0,
    },
    {
        id: "chatstore",
        label: "Chat Store (0G KV)",
        sponsor: "0G",
        logo: "/sponsors/0g.png",
        description:
            "Persistent chat history on 0G decentralized KV storage. Messages cached in-memory with async write-through. Rehydrates from 0G on first access per wallet. Keys: agentmesh/chats/{wallet}.",
        color: "bg-yellow-100",
        icon: "💾",
        row: 2,
        col: 1,
    },

    // Row 3: Discovery + Comms + Payments
    {
        id: "registry",
        label: "On-Chain Registry",
        sponsor: "ENS",
        logo: "/sponsors/ens.png",
        description:
            "AgentRegistry + ReputationTracker on 0G Chain. ENS subnames for tool identity. Stores capabilities, pricing, endpoint URLs. Queried at runtime for tool discovery.",
        color: "bg-sky-100",
        icon: "📋",
        row: 3,
        col: 0,
    },
    {
        id: "mesh",
        label: "P2P Mesh (AXL)",
        sponsor: "Gensyn",
        logo: "/sponsors/gensyn.png",
        description:
            "Gensyn AXL node for encrypted peer-to-peer agent communication. TCP transport with libp2p. Routes MCP calls between agents without centralized servers. Gossipsub for broadcast.",
        color: "bg-green-100",
        icon: "🌐",
        row: 3,
        col: 1,
    },
    {
        id: "x402",
        label: "x402 Payments",
        description:
            "HTTP 402-based micropayment protocol. Tools return 402 + payment requirements. Client signs EIP-712 USDC authorization. Facilitator verifies & settles on Base Sepolia.",
        color: "bg-emerald-100",
        icon: "💸",
        row: 3,
        col: 2,
    },

    // Row 4: Execution layer
    {
        id: "tools",
        label: "MCP Tool Providers",
        sponsor: "KeeperHub",
        logo: "/sponsors/keeperhub.png",
        description:
            "Lightweight MCP endpoints. No GPU needed. KeeperHub DeFi workflows (scan-yields, risk-assess, protocol-stats). Each tool earns USDC per call. Reputation tracked on-chain.",
        color: "bg-blue-100",
        icon: "🔧",
        row: 4,
        col: 0,
    },
    {
        id: "swap",
        label: "Trading API",
        sponsor: "Uniswap",
        logo: "/sponsors/uniswap.png",
        description:
            "Uniswap Trading API for real-time quotes and swap execution. Returns calldata for user wallet signing. Supports 6 chains (ETH, Base, Arbitrum, Optimism, Polygon, Avalanche).",
        color: "bg-pink-100",
        icon: "🔄",
        row: 4,
        col: 1,
    },
    {
        id: "chain",
        label: "0G Chain + Contracts",
        sponsor: "0G",
        logo: "/sponsors/0g.png",
        description:
            "0G Newton testnet. Hosts AgentRegistry and ReputationTracker smart contracts. Records tool registrations, execution scores, and payment settlements.",
        color: "bg-purple-100",
        icon: "⛓️",
        row: 4,
        col: 2,
    },
];

/* ─── Connections ─── */
const CONNECTIONS: Connection[] = [
    { from: "wallet", to: "client", label: "wagmi" },
    { from: "client", to: "server", label: "WebSocket" },
    { from: "server", to: "orchestrator", label: "events" },
    { from: "orchestrator", to: "chatstore", label: "persist" },
    { from: "orchestrator", to: "registry", label: "discover" },
    { from: "orchestrator", to: "mesh", label: "route" },
    { from: "orchestrator", to: "x402", label: "pay" },
    { from: "mesh", to: "tools", label: "MCP call" },
    { from: "tools", to: "swap", label: "execute" },
    { from: "registry", to: "chain", label: "contracts" },
    { from: "x402", to: "chain", label: "settle" },
    { from: "chatstore", to: "chain", label: "0G KV" },
];

/* ─── Animated flow examples ─── */
const FLOWS: AnimatedFlow[] = [
    {
        id: "goal",
        label: "User submits a goal",
        steps: ["wallet", "client", "server", "orchestrator", "registry", "mesh", "tools"],
        color: "#ef4444",
    },
    {
        id: "payment",
        label: "x402 micropayment",
        steps: ["tools", "x402", "server", "client", "wallet", "client", "x402", "chain"],
        color: "#10b981",
    },
    {
        id: "swap-flow",
        label: "Token swap execution",
        steps: ["orchestrator", "mesh", "tools", "swap", "server", "client", "wallet"],
        color: "#ec4899",
    },
    {
        id: "storage",
        label: "Message persistence",
        steps: ["orchestrator", "chatstore", "chain"],
        color: "#f59e0b",
    },
];

/* ─── Layout: positions as percentages ─── */
const ROW_Y = [4, 20, 38, 58, 80]; // Y% per row
const COL_X: Record<number, number[]> = {
    0: [25, 65],       // wallet, client
    1: [45],           // server (centered)
    2: [30, 70],       // orchestrator, chatstore
    3: [15, 50, 85],   // registry, mesh, x402
    4: [15, 50, 85],   // tools, swap, chain
};

function getNodePos(node: ArchNode) {
    return { x: COL_X[node.row][node.col], y: ROW_Y[node.row] };
}

function getCenter(id: string) {
    const node = NODES.find((n) => n.id === id)!;
    const pos = getNodePos(node);
    return { x: pos.x, y: pos.y + 4 };
}

/* ─── Component ─── */
export function ArchitectureDiagram() {
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [activeFlow, setActiveFlow] = useState<string | null>(null);
    const [flowStep, setFlowStep] = useState(-1);
    const [autoPlay, setAutoPlay] = useState(true);

    // Auto-cycle flows
    const cycleFlows = useCallback(() => {
        if (!autoPlay || activeNode) return;
        setActiveFlow((prev) => {
            const idx = FLOWS.findIndex((f) => f.id === prev);
            return FLOWS[(idx + 1) % FLOWS.length].id;
        });
        setFlowStep(0);
    }, [autoPlay, activeNode]);

    useEffect(() => {
        const interval = setInterval(cycleFlows, 4000);
        return () => clearInterval(interval);
    }, [cycleFlows]);

    // Animate steps within a flow
    useEffect(() => {
        if (!activeFlow || flowStep < 0) return;
        const flow = FLOWS.find((f) => f.id === activeFlow);
        if (!flow || flowStep >= flow.steps.length - 1) return;
        const timer = setTimeout(() => setFlowStep((s) => s + 1), 450);
        return () => clearTimeout(timer);
    }, [activeFlow, flowStep]);

    const currentFlow = FLOWS.find((f) => f.id === activeFlow);
    const litNodes = currentFlow ? currentFlow.steps.slice(0, flowStep + 1) : [];

    const isNodeLit = (id: string) => {
        if (activeNode) {
            return (
                id === activeNode ||
                CONNECTIONS.some(
                    (c) =>
                        (c.from === activeNode && c.to === id) ||
                        (c.to === activeNode && c.from === id)
                )
            );
        }
        if (currentFlow && litNodes.length > 0) return litNodes.includes(id);
        return true;
    };

    const isConnLit = (from: string, to: string) => {
        if (activeNode) {
            return CONNECTIONS.some(
                (c) =>
                    ((c.from === from && c.to === to) || (c.from === to && c.to === from)) &&
                    (from === activeNode || to === activeNode)
            );
        }
        if (currentFlow && litNodes.length > 1) {
            for (let i = 0; i < litNodes.length - 1; i++) {
                const a = litNodes[i], b = litNodes[i + 1];
                if ((from === a && to === b) || (from === b && to === a)) return true;
            }
        }
        return !activeNode && !activeFlow;
    };

    const flowColor = currentFlow?.color ?? "#000";

    return (
        <div className="relative w-full select-none" style={{ minHeight: 700 }}>
            {/* Flow selector */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase opacity-40 mr-1">
                    Flows:
                </span>
                {FLOWS.map((flow) => (
                    <button
                        key={flow.id}
                        onClick={() => {
                            setAutoPlay(false);
                            setActiveFlow(flow.id);
                            setFlowStep(0);
                            setActiveNode(null);
                        }}
                        className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase transition-all ${activeFlow === flow.id
                                ? "shadow-[2px_2px_0px_0px_#000]"
                                : "shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px]"
                            }`}
                        style={{
                            backgroundColor: activeFlow === flow.id ? flow.color + "25" : "white",
                            borderColor: activeFlow === flow.id ? flow.color : "black",
                        }}
                    >
                        {flow.label}
                    </button>
                ))}
                {!autoPlay && (
                    <button
                        onClick={() => { setAutoPlay(true); setActiveFlow(null); }}
                        className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase bg-neo-muted shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                        ▶ Auto
                    </button>
                )}
            </div>

            {/* SVG layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ top: 44, minHeight: 656 }}>
                <defs>
                    <marker id="arr" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0, 7 2.5, 0 5" fill="#000" />
                    </marker>
                    <marker id="arr-flow" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                        <polygon points="0 0, 7 2.5, 0 5" fill={flowColor} />
                    </marker>
                </defs>
                {CONNECTIONS.map((conn) => {
                    const from = getCenter(conn.from);
                    const to = getCenter(conn.to);
                    const lit = isConnLit(conn.from, conn.to);
                    const color = lit && (activeNode || activeFlow) ? (activeNode ? "#000" : flowColor) : "#d4d4d8";
                    return (
                        <g key={`${conn.from}-${conn.to}`}>
                            <line
                                x1={`${from.x}%`} y1={`${from.y}%`}
                                x2={`${to.x}%`} y2={`${to.y}%`}
                                stroke={color}
                                strokeWidth={lit ? 2.5 : 1}
                                strokeDasharray={lit ? "none" : "5 5"}
                                markerEnd={lit ? (activeFlow ? "url(#arr-flow)" : "url(#arr)") : undefined}
                                className="transition-all duration-300"
                            />
                            {lit && conn.label && (
                                <text
                                    x={`${(from.x + to.x) / 2}%`}
                                    y={`${(from.y + to.y) / 2 - 1.2}%`}
                                    textAnchor="middle"
                                    className="text-[9px] font-bold uppercase"
                                    style={{ fill: color }}
                                >
                                    {conn.label}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Node cards */}
            <div className="relative" style={{ minHeight: 656, paddingTop: 44 }}>
                {NODES.map((node) => {
                    const pos = getNodePos(node);
                    const lit = isNodeLit(node.id);
                    const isFlowNode = currentFlow && litNodes.includes(node.id);
                    // Tooltip direction: prefer right, but use left for right-side nodes
                    const tooltipLeft = pos.x > 65;
                    return (
                        <div
                            key={node.id}
                            className={`absolute transition-all duration-300 ${lit ? "opacity-100 scale-100" : "opacity-20 scale-95"}`}
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: "translate(-50%, 0)",
                                zIndex: activeNode === node.id ? 50 : 10,
                            }}
                            onMouseEnter={() => { setActiveNode(node.id); setAutoPlay(false); setActiveFlow(null); }}
                            onMouseLeave={() => setActiveNode(null)}
                        >
                            {/* Card */}
                            <div
                                className={`border-3 border-black p-2.5 ${node.color} min-w-[120px] max-w-[150px] cursor-pointer transition-shadow duration-200 ${activeNode === node.id || isFlowNode
                                        ? "shadow-[5px_5px_0px_0px_#000]"
                                        : "shadow-[3px_3px_0px_0px_#000]"
                                    }`}
                                style={{
                                    borderColor: isFlowNode ? flowColor : undefined,
                                }}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-sm">{node.icon}</span>
                                    {node.logo && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={node.logo} alt="" className="h-3.5 w-auto opacity-70" />
                                    )}
                                </div>
                                <div className="font-black text-[10px] leading-tight">{node.label}</div>
                                {node.sponsor && (
                                    <div className="text-[8px] font-bold uppercase opacity-40 mt-0.5">{node.sponsor}</div>
                                )}
                            </div>

                            {/* Tooltip beside the node */}
                            {activeNode === node.id && (
                                <div
                                    className="absolute z-[100] w-[200px] border-3 border-black bg-white p-3 shadow-[4px_4px_0px_0px_#000]"
                                    style={{
                                        top: 0,
                                        ...(tooltipLeft
                                            ? { right: "calc(100% + 12px)" }
                                            : { left: "calc(100% + 12px)" }),
                                    }}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-sm">{node.icon}</span>
                                        <span className="font-black text-[10px] uppercase leading-tight">{node.label}</span>
                                    </div>
                                    {node.sponsor && (
                                        <div className="inline-block bg-black text-white px-1.5 py-0.5 text-[8px] font-black uppercase mb-1.5">
                                            {node.sponsor}
                                        </div>
                                    )}
                                    <p className="text-[9px] leading-relaxed opacity-80">{node.description}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {CONNECTIONS.filter((c) => c.from === node.id || c.to === node.id).map((c) => {
                                            const otherId = c.from === node.id ? c.to : c.from;
                                            const other = NODES.find((n) => n.id === otherId);
                                            return (
                                                <span key={`${c.from}-${c.to}`} className="bg-neo-muted border border-black px-1 py-0.5 text-[7px] font-bold uppercase">
                                                    {c.label ?? other?.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Active flow indicator */}
            {activeFlow && currentFlow && (
                <div
                    className="border-2 border-black px-3 py-2 text-[10px] font-bold flex items-center gap-2 mt-1"
                    style={{ backgroundColor: currentFlow.color + "12", borderColor: currentFlow.color }}
                >
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentFlow.color }} />
                    <span className="uppercase">{currentFlow.label}</span>
                    <span className="opacity-40 ml-auto text-[9px]">
                        {currentFlow.steps.map((s) => NODES.find((n) => n.id === s)?.icon ?? "").join(" → ")}
                    </span>
                </div>
            )}
        </div>
    );
}
