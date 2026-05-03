"use client";

import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { TransactionRequest } from "@/hooks/useOrchestrator";
import { useState } from "react";

interface TransactionApprovalProps {
    transaction: TransactionRequest;
    onApprove: (txHash: string) => void;
    onReject: () => void;
}

const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    42161: "Arbitrum",
    10: "Optimism",
    137: "Polygon",
    43114: "Avalanche",
    84532: "Base Sepolia",
};

export function TransactionApproval({ transaction, onApprove, onReject }: TransactionApprovalProps) {
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
    const { sendTransactionAsync, isPending } = useSendTransaction();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    const handleApprove = async () => {
        try {
            const hash = await sendTransactionAsync({
                to: transaction.transaction.to as `0x${string}`,
                data: transaction.transaction.data as `0x${string}`,
                value: transaction.transaction.value
                    ? BigInt(transaction.transaction.value)
                    : BigInt(0),
                chainId: transaction.transaction.chainId,
            });
            setTxHash(hash);
            onApprove(hash);
        } catch (err) {
            console.error("Transaction rejected:", err);
            // User rejected in wallet — don't auto-reject, let them retry
        }
    };

    const chainName = CHAIN_NAMES[transaction.transaction.chainId] ?? `Chain ${transaction.transaction.chainId}`;
    const ethValue = transaction.transaction.value && transaction.transaction.value !== "0"
        ? `${(Number(BigInt(transaction.transaction.value)) / 1e18).toFixed(6)} ETH`
        : "0 ETH";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-neo-white border-4 border-black shadow-[8px_8px_0px_0px_#000] w-[420px] max-w-[90vw]">
                {/* Header */}
                <div className="border-b-4 border-black bg-neo-purple px-5 py-3">
                    <h3 className="font-black uppercase text-sm text-white">🔄 Swap Transaction</h3>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    <p className="mono text-xs text-black/60">
                        Review and confirm this on-chain swap. This will broadcast a transaction from your wallet.
                    </p>

                    {/* Swap details */}
                    <div className="border-2 border-black/20 bg-neo-bg p-3 space-y-2">
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Swap</span>
                            <span className="mono text-xs font-black">
                                {transaction.quote.amountIn} {transaction.quote.tokenIn} → {transaction.quote.amountOut} {transaction.quote.tokenOut}
                            </span>
                        </div>
                        {transaction.quote.route && (
                            <div className="flex justify-between">
                                <span className="mono text-xs text-black/60">Route</span>
                                <span className="mono text-xs font-black">{transaction.quote.route}</span>
                            </div>
                        )}
                        {transaction.quote.priceImpact && (
                            <div className="flex justify-between">
                                <span className="mono text-xs text-black/60">Price Impact</span>
                                <span className="mono text-xs font-black">{transaction.quote.priceImpact}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Network</span>
                            <span className="mono text-xs font-black">{chainName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Value</span>
                            <span className="mono text-xs font-black">{ethValue}</span>
                        </div>
                        {transaction.quote.gasEstimate && (
                            <div className="flex justify-between">
                                <span className="mono text-xs text-black/60">Gas Est.</span>
                                <span className="mono text-xs font-black">{transaction.quote.gasEstimate}</span>
                            </div>
                        )}
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 border-2 border-amber-300 p-2 flex items-start gap-2">
                        <span className="text-sm">⚠️</span>
                        <p className="mono text-[10px] text-amber-900">
                            This will execute an on-chain transaction. Once confirmed, it cannot be reversed.
                            Ensure you have enough ETH for gas on {chainName}.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t-4 border-black px-5 py-3 flex gap-3">
                    <button
                        onClick={onReject}
                        disabled={isPending || isConfirming}
                        className="flex-1 bg-red-100 border-3 border-black px-3 py-2 mono text-xs font-black uppercase hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isPending || isConfirming}
                        className="flex-1 bg-purple-200 border-3 border-black px-3 py-2 mono text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                    >
                        {isPending ? "Confirm in wallet..." : isConfirming ? "Broadcasting..." : "Execute Swap"}
                    </button>
                </div>
            </div>
        </div>
    );
}
