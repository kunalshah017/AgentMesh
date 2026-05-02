"use client";

import { useSignTypedData } from "wagmi";
import type { PaymentRequest } from "@/hooks/useOrchestrator";

interface PaymentApprovalProps {
    payment: PaymentRequest;
    onApprove: (signature: string) => void;
    onReject: () => void;
}

export function PaymentApproval({ payment, onApprove, onReject }: PaymentApprovalProps) {
    const { signTypedDataAsync, isPending } = useSignTypedData();

    const handleApprove = async () => {
        try {
            const signature = await signTypedDataAsync({
                domain: payment.eip712.domain,
                types: payment.eip712.types,
                primaryType: "TransferWithAuthorization",
                message: payment.eip712.message,
            });
            onApprove(signature);
        } catch (err) {
            console.error("Signature rejected:", err);
            // User rejected in MetaMask — don't auto-reject, let them retry
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-neo-white border-4 border-black shadow-[8px_8px_0px_0px_#000] w-[380px] max-w-[90vw]">
                {/* Header */}
                <div className="border-b-4 border-black bg-neo-accent px-5 py-3">
                    <h3 className="font-black uppercase text-sm">💸 Payment Required</h3>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    <p className="mono text-xs text-black/60">
                        This tool call requires an x402 micropayment. Sign to authorize the transfer.
                    </p>

                    {/* Details */}
                    <div className="border-2 border-black/20 bg-neo-bg p-3 space-y-2">
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Tool</span>
                            <span className="mono text-xs font-black">{payment.toolName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Amount</span>
                            <span className="mono text-xs font-black text-green-700">{payment.amount} USDC</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Recipient</span>
                            <span className="mono text-xs font-black">{payment.recipient}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="mono text-xs text-black/60">Network</span>
                            <span className="mono text-xs font-black">Base Sepolia</span>
                        </div>
                    </div>

                    {/* Protocol info */}
                    <div className="bg-blue-50 border-2 border-blue-200 p-2 flex items-start gap-2">
                        <span className="text-sm">ℹ️</span>
                        <p className="mono text-[10px] text-blue-800">
                            This signs an EIP-3009 TransferWithAuthorization. The USDC transfer settles on Base Sepolia.
                            You are only signing — no gas required for the signature.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t-4 border-black px-5 py-3 flex gap-3">
                    <button
                        onClick={onReject}
                        disabled={isPending}
                        className="flex-1 bg-red-100 border-3 border-black px-3 py-2 mono text-xs font-black uppercase hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isPending}
                        className="flex-1 bg-green-200 border-3 border-black px-3 py-2 mono text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                    >
                        {isPending ? "Signing..." : "Sign & Pay"}
                    </button>
                </div>
            </div>
        </div>
    );
}
