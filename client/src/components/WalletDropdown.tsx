"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useDisconnect, useBalance, useSwitchChain, useReadContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { BASE_SEPOLIA_USDC } from "@/config/wagmi";

const ERC20_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

export function WalletDropdown() {
    const { address, chain } = useAccount();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Native balance on current chain
    const { data: nativeBalance } = useBalance({ address });

    // USDC balance on Base Sepolia
    const { data: usdcRaw } = useReadContract({
        address: BASE_SEPOLIA_USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: baseSepolia.id,
        query: { enabled: !!address },
    });

    const usdcBalance = usdcRaw ? formatUnits(usdcRaw, 6) : "0.00";
    const isOnBaseSepolia = chain?.id === baseSepolia.id;

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    if (!address) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(!open)}
                className={`border-4 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2 ${isOnBaseSepolia ? "bg-green-200" : "bg-yellow-200"
                    }`}
            >
                <span className={`w-2 h-2 rounded-full ${isOnBaseSepolia ? "bg-green-500" : "bg-yellow-500"}`} />
                {address.slice(0, 6)}...{address.slice(-4)}
                <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-neo-white border-4 border-black shadow-[6px_6px_0px_0px_#000] z-50">
                    {/* Header */}
                    <div className="border-b-4 border-black px-4 py-3 bg-neo-bg">
                        <p className="mono text-xs text-black/60 uppercase font-black">Connected Wallet</p>
                        <p className="mono text-sm font-black mt-1 break-all">{address}</p>
                    </div>

                    {/* Chain info */}
                    <div className="border-b-2 border-black/20 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="mono text-xs font-black uppercase text-black/60">Network</span>
                            <span className={`mono text-xs font-black px-2 py-0.5 border-2 border-black ${isOnBaseSepolia ? "bg-green-200" : "bg-yellow-200"
                                }`}>
                                {chain?.name ?? "Unknown"}
                            </span>
                        </div>
                        {!isOnBaseSepolia && (
                            <button
                                onClick={() => switchChain({ chainId: baseSepolia.id })}
                                className="mt-2 w-full bg-neo-accent border-3 border-black px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                            >
                                ⚡ Switch to Base Sepolia
                            </button>
                        )}
                    </div>

                    {/* Balances */}
                    <div className="border-b-2 border-black/20 px-4 py-3 space-y-2">
                        <p className="mono text-xs font-black uppercase text-black/60">Balances</p>

                        {/* Native balance */}
                        <div className="flex items-center justify-between">
                            <span className="mono text-xs">{nativeBalance?.symbol ?? "ETH"}</span>
                            <span className="mono text-xs font-black">
                                {nativeBalance ? parseFloat(formatUnits(nativeBalance.value, nativeBalance.decimals)).toFixed(4) : "—"}
                            </span>
                        </div>

                        {/* USDC balance (Base Sepolia) */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <span className="mono text-xs">USDC</span>
                                <span className="mono text-[10px] text-black/40">(Base Sepolia)</span>
                            </div>
                            <span className="mono text-xs font-black">
                                {parseFloat(usdcBalance).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* x402 info */}
                    <div className="border-b-2 border-black/20 px-4 py-3 bg-blue-50">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">💸</span>
                            <div>
                                <p className="mono text-[10px] font-black uppercase text-black/60">x402 Payments</p>
                                <p className="mono text-[10px] text-black/80">
                                    Tool calls pay agents in USDC on Base Sepolia
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 flex gap-2">
                        <a
                            href={`https://sepolia.basescan.org/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-neo-bg border-3 border-black px-2 py-1.5 mono text-[10px] font-black uppercase hover:bg-neo-muted transition-colors"
                        >
                            Explorer ↗
                        </a>
                        <button
                            onClick={() => { disconnect(); setOpen(false); }}
                            className="flex-1 bg-red-100 border-3 border-black px-2 py-1.5 mono text-[10px] font-black uppercase hover:bg-red-200 transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
