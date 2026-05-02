"use client";

import { Navbar } from "@/components/Navbar";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/config/contracts";
import { namehash, keccak256, toBytes, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;
const PARENT_DOMAIN = "agent-mesh.eth";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Public client for ENS lookups on Sepolia
const sepoliaClient = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

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
            setStatus("available"); // If lookup fails, assume available
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

export default function PublishPage() {
    const { isConnected, address } = useAccount();
    const [name, setName] = useState("");
    const [capabilities, setCapabilities] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [ensStatus2, setEnsStatus2] = useState<"idle" | "registering" | "success" | "error">("idle");
    const [ensError, setEnsError] = useState("");

    const { status: ensStatus, ensName } = useEnsAvailability(name);

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // After on-chain registration succeeds, create ENS subname via orchestrator API
    useEffect(() => {
        if (!isSuccess || !address || !name || ensStatus2 !== "idle") return;

        const registerEns = async () => {
            if (!API_URL) {
                // Skip ENS registration if no backend configured
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
                        endpoint: endpoint || undefined,
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
    }, [isSuccess, address, name, endpoint, capabilities, ensStatus2]);

    const handleRegister = () => {
        if (!name || !endpoint || ensStatus === "taken") return;
        const cats = capabilities ? capabilities.split(",").map((c) => c.trim()) : [name];
        const fullEnsName = `${name}.${PARENT_DOMAIN}`;
        writeContract({
            address: REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: "registerAgent",
            args: [fullEnsName, endpoint, cats],
            chainId: 16602,
        });
    };

    return (
        <div className="min-h-screen bg-neo-bg">
            {/* Nav */}
            <Navbar />

            <main className="max-w-3xl mx-auto px-6 py-12">
                <h2 className="text-3xl md:text-4xl font-black uppercase mb-2">Publish Your MCP Server</h2>
                <p className="text-sm font-medium mb-8 opacity-70">
                    Register your MCP server on-chain. The orchestrator will auto-discover all your tools via <code>tools/list</code> and pay you per call via x402.
                </p>

                {/* Steps */}
                <div className="flex gap-3 mb-10">
                    {["1. Deploy MCP", "2. Register", "3. Earn Per Call"].map((s, i) => (
                        <div key={i} className={`border-3 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] ${i === 1 ? "bg-neo-accent" : "bg-neo-bg"}`}>
                            {s}
                        </div>
                    ))}
                </div>

                {!isConnected ? (
                    <div className="border-4 border-black p-8 bg-neo-white shadow-[6px_6px_0px_0px_#000] text-center">
                        <span className="text-4xl mb-4 block">🔐</span>
                        <p className="font-black text-lg uppercase mb-4">Connect Your Wallet to Register</p>
                        <p className="text-sm opacity-60 mb-6">You need a wallet on 0G Chain Testnet to register a tool on-chain.</p>
                        <WalletConnectBtn />
                    </div>
                ) : (
                    <div className="border-4 border-black p-6 bg-neo-white shadow-[6px_6px_0px_0px_#000]">
                        <div className="mb-4 bg-green-100 border-2 border-black p-3 flex items-center gap-2">
                            <span>✅</span>
                            <span className="text-xs font-black uppercase">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
                            <span className="text-[10px] opacity-50 ml-auto">0G Chain Testnet</span>
                        </div>

                        {/* Earnings Wallet */}
                        <div className="mb-6 border-2 border-black bg-neo-bg p-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Earnings Wallet (receives x402 USDC)</span>
                                <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5">BASE SEPOLIA</span>
                            </div>
                            <div className="font-mono text-sm font-bold break-all">{address}</div>
                            <p className="text-[10px] mt-2 opacity-50">
                                When other agents use your tool, x402 micropayments will be sent to this wallet on Base Sepolia.
                            </p>
                        </div>

                        <div className="space-y-5">
                            {/* Provider Name + ENS Check */}
                            <div>
                                <label className="text-xs font-black uppercase block mb-1">Provider Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    placeholder="e.g. gas-tools, defi-analytics"
                                    className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                                />
                                {/* ENS Availability */}
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

                            {/* MCP Endpoint (primary field) */}
                            <div>
                                <label className="text-xs font-black uppercase block mb-1">MCP Endpoint URL *</label>
                                <input
                                    type="text"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    placeholder="https://your-server.com/mcp"
                                    className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                                />
                                <p className="text-[10px] mt-1 opacity-50">
                                    Your MCP server URL. The orchestrator calls <code>tools/list</code> to discover all available tools automatically.
                                </p>
                            </div>

                            {/* Categories (informational) */}
                            <div>
                                <label className="text-xs font-black uppercase block mb-1">Categories <span className="opacity-50">(comma separated, for discovery)</span></label>
                                <input
                                    type="text"
                                    value={capabilities}
                                    onChange={(e) => setCapabilities(e.target.value)}
                                    placeholder="e.g. gas-prediction, defi-research, execution"
                                    className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleRegister}
                                disabled={isPending || isConfirming || !name || !endpoint || ensStatus === "taken" || ensStatus === "checking"}
                                className={`w-full border-4 border-black p-4 text-lg font-black uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${isPending || isConfirming || ensStatus === "taken" || ensStatus === "checking"
                                    ? "bg-gray-300 cursor-wait"
                                    : "bg-neo-accent cursor-pointer"
                                    }`}
                            >
                                {isPending
                                    ? "Confirm in Wallet..."
                                    : isConfirming
                                        ? "Registering On-Chain..."
                                        : ensStatus === "taken"
                                            ? "ENS Name Taken — Choose Another"
                                            : "Register Tool On-Chain →"}
                            </button>

                            {/* Success */}
                            {isSuccess && txHash && (
                                <div className="border-4 border-green-600 bg-green-100 p-4 mt-4">
                                    <p className="font-black text-sm uppercase text-green-800">✅ MCP Server Registered!</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        ENS: <span className="font-mono font-bold">{name}.{PARENT_DOMAIN}</span>
                                        {ensStatus2 === "registering" && " — Creating subname..."}
                                        {ensStatus2 === "success" && " — ✅ Subname created!"}
                                        {ensStatus2 === "error" && ` — ⚠️ Subname failed: ${ensError}`}
                                    </p>
                                    <p className="text-xs text-green-700 mt-1">
                                        Earnings wallet: <span className="font-mono">{address}</span>
                                    </p>
                                    <a
                                        href={`https://chainscan-newton.0g.ai/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline text-green-700 mt-2 block"
                                    >
                                        View Transaction →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Code Example */}
                <div className="mt-12 border-4 border-black p-5 bg-black text-green-400 shadow-[5px_5px_0px_0px_#000]">
                    <div className="text-xs font-black uppercase text-white mb-3">Or register via CLI:</div>
                    <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                        {`bun run packages/contracts/scripts/register-tool.ts \\
  --name "${name || "my-tool"}" \\
  --endpoint "${endpoint || "https://your-server.com/mcp"}" \\
  --capabilities "${capabilities || "capability-1,capability-2"}"`}
                    </pre>
                </div>
            </main>
        </div>
    );
}
