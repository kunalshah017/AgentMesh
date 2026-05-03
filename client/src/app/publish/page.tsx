"use client";

import { Navbar } from "@/components/Navbar";
import { StickerLayer } from "@/components/StickerLayer";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi";
import { useState, useEffect, useCallback, useRef } from "react";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/config/contracts";
import { namehash, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;
const PARENT_DOMAIN = "agent-mesh.eth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Public client for ENS lookups on Sepolia
const sepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

// ─── MCP Discovery Hook ───
interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

interface MCPDiscovery {
    status: "idle" | "searching" | "found" | "not-found";
    mcpEndpoint: string;
    tools: MCPTool[];
    serverInfo: { name?: string; version?: string } | null;
    pricing: { price?: string; currency?: string; description?: string } | null;
    error: string;
}

function useMCPDiscovery() {
    const [state, setState] = useState<MCPDiscovery>({
        status: "idle",
        mcpEndpoint: "",
        tools: [],
        serverInfo: null,
        pricing: null,
        error: "",
    });
    const abortRef = useRef<AbortController | null>(null);

    const discover = useCallback(async (rawUrl: string) => {
        // Cancel previous
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        if (!rawUrl || rawUrl.length < 8) {
            setState({ status: "idle", mcpEndpoint: "", tools: [], serverInfo: null, pricing: null, error: "" });
            return;
        }

        setState((s) => ({ ...s, status: "searching", tools: [], serverInfo: null, pricing: null, error: "" }));

        // Normalize URL
        let baseUrl = rawUrl.trim();
        if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
        // Remove trailing slash
        baseUrl = baseUrl.replace(/\/+$/, "");

        // Candidate endpoints to try
        const candidates = [
            baseUrl.endsWith("/mcp") ? baseUrl : null,
            `${baseUrl}/mcp`,
            `${baseUrl}/api/mcp`,
            baseUrl, // try root as MCP endpoint
        ].filter(Boolean) as string[];

        // De-duplicate
        const unique = [...new Set(candidates)];

        let foundEndpoint = "";
        let foundTools: MCPTool[] = [];
        let foundServerInfo: { name?: string; version?: string } | null = null;

        for (const url of unique) {
            if (controller.signal.aborted) return;
            try {
                // Try tools/list
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
                    signal: controller.signal,
                });
                if (!res.ok) continue;
                const data = await res.json();
                if (data?.result?.tools && Array.isArray(data.result.tools) && data.result.tools.length > 0) {
                    foundEndpoint = url;
                    foundTools = data.result.tools;

                    // Also try initialize for server info
                    try {
                        const initRes = await fetch(url, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "initialize" }),
                            signal: controller.signal,
                        });
                        if (initRes.ok) {
                            const initData = await initRes.json();
                            foundServerInfo = initData?.result?.serverInfo ?? null;
                        }
                    } catch { /* ignore */ }
                    break;
                }
            } catch {
                continue;
            }
        }

        if (controller.signal.aborted) return;

        if (!foundEndpoint) {
            setState({ status: "not-found", mcpEndpoint: "", tools: [], serverInfo: null, pricing: null, error: "No MCP server found. Make sure your server responds to POST with tools/list." });
            return;
        }

        // Try to fetch x402 pricing
        let pricing: MCPDiscovery["pricing"] = null;
        try {
            const pricingBase = foundEndpoint.replace(/\/mcp$/, "").replace(/\/api\/mcp$/, "");
            const pricingRes = await fetch(`${pricingBase}/.well-known/x402.json`, { signal: controller.signal });
            if (pricingRes.ok) {
                const pData = await pricingRes.json();
                pricing = { price: pData.price, currency: pData.accepts?.[0] ?? "USDC", description: pData.description };
            }
        } catch { /* ignore */ }

        if (controller.signal.aborted) return;

        setState({
            status: "found",
            mcpEndpoint: foundEndpoint,
            tools: foundTools,
            serverInfo: foundServerInfo,
            pricing,
            error: "",
        });
    }, []);

    return { ...state, discover };
}

function useEnsAvailability(toolName: string) {
    const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [ensName, setEnsName] = useState("");

    const check = useCallback(async (name: string) => {
        if (!name || name.length < 3) {
            setStatus("idle");
            setEnsName("");
            return;
        }
        const fullName = `${name}.${PARENT_DOMAIN}`;
        setEnsName(fullName);
        setStatus("checking");

        try {
            const node = namehash(fullName);
            const owner = await sepoliaClient.readContract({
                address: ENS_REGISTRY,
                abi: [{ name: "owner", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] }],
                functionName: "owner",
                args: [node],
            });
            setStatus(owner === "0x0000000000000000000000000000000000000000" ? "available" : "taken");
        } catch {
            setStatus("available");
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => check(toolName), 400);
        return () => clearTimeout(timeout);
    }, [toolName, check]);

    return { status, ensName };
}

function WalletConnectBtn() {
    const { connect, connectors } = useConnect();
    return (
        <button
            onClick={() => connect({ connector: connectors[0] })}
            className="bg-neo-secondary border-4 border-black px-6 py-3 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
            Connect Wallet
        </button>
    );
}

// Per-tool metadata — only description is required (standard MCP field)
interface ToolMeta {
    description: string;
}

function validateToolMeta(meta: ToolMeta): string[] {
    const issues: string[] = [];
    if (!meta.description || meta.description.length < 10) issues.push("description (min 10 chars)");
    return issues;
}

export default function PublishPage() {
    const { isConnected, address } = useAccount();
    const [name, setName] = useState("");
    const [capabilities, setCapabilities] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [ensStatus2, setEnsStatus2] = useState<"idle" | "registering" | "success" | "error">("idle");
    const [ensError, setEnsError] = useState("");
    const [toolMetas, setToolMetas] = useState<Record<string, ToolMeta>>({});

    const { status: ensStatus, ensName } = useEnsAvailability(name);
    const mcp = useMCPDiscovery();

    const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });
    const { switchChainAsync } = useSwitchChain();
    const chainId = useChainId();

    // Debounced MCP discovery when endpoint changes
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (endpoint.length >= 8) mcp.discover(endpoint);
        }, 600);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    // Initialize tool metadata from discovered tools
    useEffect(() => {
        if (mcp.status === "found" && mcp.tools.length > 0) {
            setToolMetas((prev) => {
                const next: Record<string, ToolMeta> = {};
                for (const tool of mcp.tools) {
                    next[tool.name] = prev[tool.name] ?? {
                        description: tool.description ?? "",
                    };
                }
                return next;
            });
        }
    }, [mcp.status, mcp.tools]);

    // Calculate validation
    const allToolsValid = mcp.tools.length > 0 && mcp.tools.every((t) => {
        const meta = toolMetas[t.name];
        return meta && validateToolMeta(meta).length === 0;
    });
    const incompleteCount = mcp.tools.filter((t) => {
        const meta = toolMetas[t.name];
        return !meta || validateToolMeta(meta).length > 0;
    }).length;

    // After on-chain registration succeeds, create ENS subname via orchestrator API
    useEffect(() => {
        if (!isSuccess || !address || !name || ensStatus2 !== "idle") return;

        const registerEns = async () => {
            if (!API_URL) {
                setEnsStatus2("success");
                return;
            }
            setEnsStatus2("registering");
            try {
                const res = await fetch(`${API_URL}/ens/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        label: name,
                        ownerAddress: address,
                        endpoint: mcp.mcpEndpoint || endpoint,
                        description: capabilities,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || `HTTP ${res.status}`);
                }
                setEnsStatus2("success");
            } catch (err) {
                setEnsStatus2("error");
                setEnsError(String(err));
            }
        };
        registerEns();
    }, [isSuccess, address, name, endpoint, capabilities, ensStatus2, mcp.mcpEndpoint]);

    const canPublish = mcp.status === "found" && name.length >= 3 && ensStatus !== "taken" && ensStatus !== "checking" && allToolsValid;

    const handleRegister = async () => {
        if (!canPublish) return;
        try {
            if (chainId !== 16602) {
                await switchChainAsync({ chainId: 16602 });
            }
            const cats = capabilities ? capabilities.split(",").map((c) => c.trim()).filter(Boolean) : [name];
            const fullEnsName = `${name}.${PARENT_DOMAIN}`;
            writeContract({
                address: REGISTRY_ADDRESS,
                abi: REGISTRY_ABI,
                functionName: "registerAgent",
                args: [fullEnsName, mcp.mcpEndpoint, cats],
                chainId: 16602,
            });
        } catch (err) {
            console.error("Registration failed:", err);
        }
    };

    return (
        <div className="relative min-h-screen bg-neo-bg">
            <Navbar />

            <StickerLayer
                stickers={[
                    { src: "/mascots/publish-page-mascot.png", width: 140, rotate: -2, position: { xPercent: 78, yPercent: 3 } },
                ]}
            />

            <main className="max-w-3xl mx-auto px-6 py-12">
                <h2 className="text-3xl md:text-4xl font-black uppercase mb-2">Publish Your MCP Server</h2>
                <p className="text-sm font-medium mb-8 opacity-70">
                    Paste your server URL — we&apos;ll auto-detect the MCP endpoint, load your tools, and register on-chain.
                </p>

                {/* Steps */}
                <div className="flex gap-3 mb-10">
                    {["1. Paste URL", "2. Verify Tools", "3. Register On-Chain"].map((s, i) => {
                        const active = (i === 0 && mcp.status === "searching")
                            || (i === 1 && mcp.status === "found" && !isSuccess)
                            || (i === 2 && (isConfirming || isSuccess));
                        return (
                            <div key={i} className={`border-3 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] ${active ? (isSuccess && i === 2 ? "bg-green-400" : "bg-neo-secondary") : "bg-neo-bg"}`}>
                                {s}
                            </div>
                        );
                    })}
                </div>

                {/* MCP URL Input — always visible */}
                <div className="border-4 border-black p-6 bg-neo-white shadow-[6px_6px_0px_0px_#000] mb-6">
                    <label className="text-xs font-black uppercase block mb-2">Server URL *</label>
                    <input
                        type="text"
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        placeholder="https://your-server.vercel.app or https://your-server.com/mcp"
                        className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent font-mono"
                    />
                    <p className="text-[10px] mt-1.5 opacity-50">
                        Paste any URL — we&apos;ll try <code>/mcp</code>, <code>/api/mcp</code>, and the root to find your MCP server.
                    </p>

                    {/* Discovery Status */}
                    {mcp.status === "searching" && (
                        <div className="mt-3 px-3 py-2 border-2 border-yellow-500 bg-yellow-50 text-xs font-bold text-yellow-800 animate-pulse">
                            🔍 Searching for MCP server...
                        </div>
                    )}
                    {mcp.status === "not-found" && (
                        <div className="mt-3 px-3 py-2 border-2 border-red-500 bg-red-50 text-xs font-bold text-red-800">
                            ❌ {mcp.error}
                        </div>
                    )}
                    {mcp.status === "found" && (
                        <div className="mt-3 px-3 py-2 border-2 border-green-600 bg-green-50 text-xs font-bold text-green-800">
                            ✅ MCP server found at <span className="font-mono">{mcp.mcpEndpoint}</span>
                            {mcp.serverInfo?.name && <span className="opacity-60 ml-2">({mcp.serverInfo.name} v{mcp.serverInfo.version})</span>}
                        </div>
                    )}
                </div>

                {/* Discovered Tools with metadata editors */}
                {mcp.status === "found" && mcp.tools.length > 0 && (
                    <div className="border-4 border-black p-6 bg-neo-white shadow-[6px_6px_0px_0px_#000] mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-black uppercase">Discovered Tools ({mcp.tools.length})</h3>
                            {mcp.pricing && (
                                <span className="bg-green-100 border-2 border-green-500 px-2 py-0.5 text-[10px] font-black text-green-800">
                                    {mcp.pricing.price} {mcp.pricing.currency}/call
                                </span>
                            )}
                        </div>

                        {/* Validation summary */}
                        {!allToolsValid && (
                            <div className="mb-4 px-3 py-2 border-2 border-orange-500 bg-orange-50 text-xs font-bold text-orange-800">
                                ⚠️ {incompleteCount} tool{incompleteCount > 1 ? "s" : ""} missing required metadata. Each tool needs a description (min 10 chars) to publish.
                            </div>
                        )}
                        {allToolsValid && (
                            <div className="mb-4 px-3 py-2 border-2 border-green-500 bg-green-50 text-xs font-bold text-green-800">
                                ✅ All tools have complete metadata — ready to publish!
                            </div>
                        )}

                        <div className="space-y-3">
                            {mcp.tools.map((tool) => {
                                const meta = toolMetas[tool.name] ?? { description: "" };
                                const issues = validateToolMeta(meta);
                                const isComplete = issues.length === 0;

                                return (
                                    <div key={tool.name} className={`border-2 p-3 ${isComplete ? "border-green-500 bg-green-50" : "border-orange-400 bg-orange-50"}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs ${isComplete ? "text-green-600" : "text-orange-500"}`}>{isComplete ? "✅" : "⚠️"}</span>
                                            <span className="font-black text-sm">{tool.name}</span>
                                            {mcp.pricing?.price && (
                                                <span className="ml-auto bg-green-100 border border-green-400 px-1.5 py-0.5 text-[9px] font-black text-green-700">
                                                    {mcp.pricing.price} {mcp.pricing.currency ?? "USDC"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Parameters from schema */}
                                        {tool.inputSchema && (
                                            <div className="mb-2 flex flex-wrap gap-1">
                                                {Object.keys((tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {}).map((param) => (
                                                    <span key={param} className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold font-mono">
                                                        {param}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase block mb-0.5 opacity-70">Description *</label>
                                            <input
                                                type="text"
                                                value={meta.description}
                                                onChange={(e) => setToolMetas((prev) => ({ ...prev, [tool.name]: { ...meta, description: e.target.value } }))}
                                                placeholder="What does this tool do? (min 10 chars)"
                                                className={`w-full border-2 p-2 text-[11px] font-medium bg-white focus:outline-none ${meta.description.length >= 10 ? "border-green-400" : "border-red-300"}`}
                                            />
                                        </div>

                                        {/* Missing fields indicator */}
                                        {!isComplete && (
                                            <p className="text-[10px] text-red-600 font-bold mt-1.5">Missing: {issues.join(", ")}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!mcp.pricing && (
                            <div className="mt-3 px-3 py-2 border-2 border-dashed border-gray-400 text-[10px] text-gray-500">
                                💡 Tip: Add <code>/.well-known/x402.json</code> to your server to set x402 pricing.
                            </div>
                        )}
                    </div>
                )}

                {/* Registration Form — only if MCP found */}
                {mcp.status === "found" && (
                    <>
                        {!isConnected ? (
                            <div className="border-4 border-black p-8 bg-neo-white shadow-[6px_6px_0px_0px_#000] text-center">
                                <span className="text-4xl mb-4 block">🔐</span>
                                <p className="font-black text-lg uppercase mb-4">Connect Wallet to Register</p>
                                <p className="text-sm opacity-60 mb-6">You need a wallet on 0G Chain Testnet to register on-chain.</p>
                                <WalletConnectBtn />
                            </div>
                        ) : (
                            <div className="border-4 border-black p-6 bg-neo-white shadow-[6px_6px_0px_0px_#000]">
                                <div className="mb-4 bg-green-100 border-2 border-black p-3 flex items-center gap-2">
                                    <span>✅</span>
                                    <span className="text-xs font-black uppercase">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
                                    <span className="text-[10px] opacity-50 ml-auto">0G Chain Testnet</span>
                                </div>

                                <div className="space-y-5">
                                    {/* Provider Name + ENS Check */}
                                    <div>
                                        <label className="text-xs font-black uppercase block mb-1">Provider Name *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                            placeholder="e.g. nft-scanner, defi-analytics"
                                            className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                                        />
                                        {name.length >= 3 && (
                                            <div className={`mt-2 px-3 py-2 border-2 text-xs font-bold ${ensStatus === "checking" ? "border-gray-400 bg-gray-50 text-gray-600" :
                                                ensStatus === "available" ? "border-green-600 bg-green-50 text-green-800" :
                                                    ensStatus === "taken" ? "border-red-600 bg-red-50 text-red-800" :
                                                        "border-gray-300 bg-gray-50 text-gray-500"
                                                }`}>
                                                {ensStatus === "checking" && `⏳ Checking ${ensName}...`}
                                                {ensStatus === "available" && `✅ ${ensName} is available!`}
                                                {ensStatus === "taken" && `❌ ${ensName} is already taken`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Categories */}
                                    <div>
                                        <label className="text-xs font-black uppercase block mb-1">Categories <span className="opacity-50">(comma separated)</span></label>
                                        <input
                                            type="text"
                                            value={capabilities}
                                            onChange={(e) => setCapabilities(e.target.value)}
                                            placeholder="e.g. nft, collectibles, images"
                                            className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                                        />
                                    </div>

                                    {/* Detected endpoint info */}
                                    <div className="border-2 border-black bg-neo-bg p-3">
                                        <div className="text-[10px] font-black uppercase opacity-60 mb-1">Will register endpoint:</div>
                                        <div className="font-mono text-xs font-bold break-all">{mcp.mcpEndpoint}</div>
                                        <div className="text-[10px] opacity-50 mt-1">
                                            {mcp.tools.length} tools • Earnings go to {address?.slice(0, 6)}...{address?.slice(-4)} on Base Sepolia
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    {!allToolsValid && (
                                        <div className="px-3 py-2 border-2 border-dashed border-orange-400 bg-orange-50 text-[10px] text-orange-700 font-bold">
                                            ⚠️ Complete all tool metadata above before publishing.
                                        </div>
                                    )}
                                    <button
                                        onClick={handleRegister}
                                        disabled={isPending || isConfirming || !canPublish}
                                        className={`w-full border-4 border-black p-4 text-lg font-black uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${!canPublish || isPending || isConfirming
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : "bg-neo-accent cursor-pointer"
                                            }`}
                                    >
                                        {isPending
                                            ? "Confirm in Wallet..."
                                            : isConfirming
                                                ? "Registering On-Chain..."
                                                : !allToolsValid
                                                    ? "Complete Tool Metadata First"
                                                    : ensStatus === "taken"
                                                        ? "ENS Name Taken — Choose Another"
                                                        : `Register ${mcp.tools.length} Tools On-Chain →`}
                                    </button>

                                    {/* Error */}
                                    {writeError && (
                                        <div className="border-4 border-red-600 bg-red-100 p-4 mt-4">
                                            <p className="font-black text-sm uppercase text-red-800">❌ Transaction Failed</p>
                                            <p className="text-xs text-red-700 mt-1 break-all">{writeError.message}</p>
                                        </div>
                                    )}

                                    {/* Success */}
                                    {isSuccess && txHash && (
                                        <div className="border-4 border-green-600 bg-green-50 p-6 mt-4 text-center">
                                            <span className="text-5xl block mb-3">🎉</span>
                                            <p className="font-black text-xl uppercase text-green-800 mb-2">Successfully Registered!</p>
                                            <p className="text-sm text-green-700 mb-4">
                                                Your MCP server is now live on-chain and discoverable by all AgentMesh agents.
                                            </p>

                                            <div className="border-2 border-green-400 bg-white p-4 text-left space-y-2 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase opacity-50 w-20">ENS Name</span>
                                                    <span className="font-mono text-sm font-bold text-green-900">{name}.{PARENT_DOMAIN}</span>
                                                    {ensStatus2 === "registering" && <span className="text-[10px] text-orange-600 font-bold">Creating subname...</span>}
                                                    {ensStatus2 === "success" && <span className="text-[10px] text-green-600 font-bold">✅ Subname created</span>}
                                                    {ensStatus2 === "error" && <span className="text-[10px] text-red-600 font-bold">⚠️ {ensError}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase opacity-50 w-20">Endpoint</span>
                                                    <span className="font-mono text-xs text-green-800 break-all">{mcp.mcpEndpoint}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase opacity-50 w-20">Tools</span>
                                                    <span className="text-xs font-bold text-green-800">{mcp.tools.map((t) => t.name).join(", ")}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase opacity-50 w-20">Tx Hash</span>
                                                    <span className="font-mono text-[11px] text-green-700 break-all">{txHash}</span>
                                                </div>
                                            </div>

                                            <a
                                                href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block border-4 border-black bg-neo-accent px-6 py-3 text-sm font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                            >
                                                View Transaction on Explorer →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Blocked state when no MCP found */}
                {mcp.status === "not-found" && (
                    <div className="border-4 border-dashed border-red-400 p-6 bg-red-50 text-center">
                        <span className="text-3xl block mb-3">🚫</span>
                        <p className="font-black text-sm uppercase text-red-800 mb-2">Cannot Publish</p>
                        <p className="text-xs text-red-600">
                            No MCP server detected at this URL. Your server must respond to <code className="bg-red-100 px-1">POST /mcp</code> with <code className="bg-red-100 px-1">tools/list</code>.
                        </p>
                    </div>
                )}

                {/* Code Example */}
                <div className="mt-12 border-4 border-black p-5 bg-black text-green-400 shadow-[5px_5px_0px_0px_#000]">
                    <div className="text-xs font-black uppercase text-white mb-3">Quick start — deploy an MCP server in 2 minutes:</div>
                    <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {`# Clone our demo NFT MCP server
git clone https://github.com/kunalshah017/AgentMesh
cd AgentMesh/demo-mcp-server

# Install & run
bun install && bun run dev

# Your MCP server is live at http://localhost:4001/mcp
# Deploy to Vercel:
vercel --prod

# Then paste the URL above ↑`}
                    </pre>
                </div>
            </main>
        </div>
    );
}
