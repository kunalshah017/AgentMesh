"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { parseAbi } from "viem";

const REGISTRY_ADDRESS = "0x0B05236c972DbFCe91519a183980F0D5fFd9da28";
const REGISTRY_ABI = parseAbi([
  "function registerAgent(string name, string ensName, string[] capabilities, uint256 pricePerCall) external",
]);

export default function PublishPage() {
  const { isConnected, address } = useAccount();
  const [name, setName] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [price, setPrice] = useState("0.01");
  const [endpoint, setEndpoint] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleRegister = () => {
    if (!name || !capabilities) return;
    const caps = capabilities.split(",").map((c) => c.trim());
    const ensName = `${name}.agentmesh.eth`;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "registerAgent",
      args: [name, ensName, caps, BigInt(Math.floor(parseFloat(price) * 1e18))],
    });
  };

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
          <Link href="/explore" className="text-xs font-black uppercase hover:text-neo-accent transition-colors">Explore</Link>
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-3xl md:text-4xl font-black uppercase mb-2">Publish Your Tool</h2>
        <p className="text-sm font-medium mb-8 opacity-70">
          Register an MCP tool on-chain. Once registered, AI agents can discover and pay for your tool automatically.
        </p>

        {/* Steps */}
        <div className="flex gap-3 mb-10">
          {["1. Build", "2. Register", "3. Earn"].map((s, i) => (
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
            <ConnectButton />
          </div>
        ) : (
          <div className="border-4 border-black p-6 bg-neo-white shadow-[6px_6px_0px_0px_#000]">
            <div className="mb-4 bg-green-100 border-2 border-black p-3 flex items-center gap-2">
              <span>✅</span>
              <span className="text-xs font-black uppercase">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <span className="text-[10px] opacity-50 ml-auto">0G Chain Testnet</span>
            </div>

            <div className="space-y-5">
              {/* Tool Name */}
              <div>
                <label className="text-xs font-black uppercase block mb-1">Tool Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. gas-optimizer"
                  className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                />
              </div>

              {/* Capabilities */}
              <div>
                <label className="text-xs font-black uppercase block mb-1">Capabilities * <span className="opacity-50">(comma separated)</span></label>
                <input
                  type="text"
                  value={capabilities}
                  onChange={(e) => setCapabilities(e.target.value)}
                  placeholder="e.g. gas-prediction, fee-estimation"
                  className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-black uppercase block mb-1">Price Per Call (USDC)</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.01"
                  className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                />
              </div>

              {/* Endpoint */}
              <div>
                <label className="text-xs font-black uppercase block mb-1">MCP Endpoint URL</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://your-server.com/mcp"
                  className="w-full border-4 border-black p-3 text-sm font-bold bg-neo-bg focus:outline-none focus:border-neo-accent"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleRegister}
                disabled={isPending || isConfirming || !name || !capabilities}
                className={`w-full border-4 border-black p-4 text-lg font-black uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                  isPending || isConfirming
                    ? "bg-gray-300 cursor-wait"
                    : "bg-neo-accent cursor-pointer"
                }`}
              >
                {isPending
                  ? "Confirm in Wallet..."
                  : isConfirming
                  ? "Registering On-Chain..."
                  : "Register Tool On-Chain →"}
              </button>

              {/* Success */}
              {isSuccess && txHash && (
                <div className="border-4 border-green-600 bg-green-100 p-4 mt-4">
                  <p className="font-black text-sm uppercase text-green-800">✅ Tool Registered!</p>
                  <a
                    href={`https://chainscan-newton.0g.ai/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline text-green-700 mt-1 block"
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
  --capabilities "${capabilities || "capability-1,capability-2"}" \\
  --price "${price || "0.01"}"`}
          </pre>
        </div>
      </main>
    </div>
  );
}
