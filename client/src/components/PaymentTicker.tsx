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
        <div className="flex items-center gap-4 px-4 py-2 border-b-3 border-[var(--fg)] bg-[#0d0d0d] font-mono text-xs">
            <span className="text-[var(--accent)] font-bold tracking-wider">
                x402 PAYMENTS
            </span>
            <span className="text-[var(--fg)]">
                {payments.length} tx · {totalUSDC.toFixed(4)} USDC
            </span>
            <div className="flex gap-3 ml-auto">
                {Object.entries(byAgent).map(([agent, amount]) => (
                    <span key={agent} className="text-[#888]">
                        {agent.replace(".agentmesh.eth", "")}:{" "}
                        <span className="text-[var(--accent)]">{amount.toFixed(4)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
