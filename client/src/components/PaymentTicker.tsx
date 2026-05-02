"use client";

import type { AgentEvent } from "@/hooks/useOrchestrator";

interface PaymentTickerProps {
    events: AgentEvent[];
}

export function PaymentTicker({ events }: PaymentTickerProps) {
    const payments = events
        .filter((e) => e.type === "payment_sent")
        .map((e) => e.payment as { amount?: string; to?: string } | undefined)
        .filter(Boolean);

    const totalUSDC = payments.reduce(
        (sum, p) => sum + parseFloat(p?.amount ?? "0"),
        0,
    );

    const byAgent: Record<string, number> = {};
    for (const p of payments) {
        const to = p?.to ?? "unknown";
        byAgent[to] = (byAgent[to] ?? 0) + parseFloat(p?.amount ?? "0");
    }

    if (payments.length === 0) return null;

    return (
        <div className="flex items-center gap-4 px-4 py-2 border-b-4 border-black bg-neo-secondary">
            <span className="bg-black text-neo-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                x402 PAYMENTS
            </span>
            <span className="text-black font-black text-xs mono">
                {payments.length} tx · {totalUSDC.toFixed(4)} USDC
            </span>
            <div className="flex gap-3 ml-auto">
                {Object.entries(byAgent).map(([agent, amount]) => (
                    <span key={agent} className="text-black/60 text-xs font-bold mono">
                        {agent.replace(".agent-mesh.eth", "")}:{" "}
                        <span className="text-black font-black">{amount.toFixed(4)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
