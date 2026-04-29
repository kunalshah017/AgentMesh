import type { ConnectionStatus } from "@/hooks/useOrchestrator";

interface HeaderProps {
  status: ConnectionStatus;
  eventCount: number;
}

export function Header({ status, eventCount }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b-3 border-[var(--fg)] bg-[var(--bg)]">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black tracking-tighter uppercase">
          AGENT<span className="text-accent">MESH</span>
        </h1>
        <span className="mono text-xs text-[var(--border-heavy)] uppercase tracking-widest">
          Decentralized Agent Marketplace
        </span>
      </div>

      <div className="flex items-center gap-6 mono text-xs">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${status === "connected" ? "active" : status === "connecting" ? "warning" : "error"}`} />
          <span>{status === "connected" ? "LIVE" : status === "connecting" ? "CONNECTING" : "OFFLINE"}</span>
        </div>
        <div className="text-[var(--border-heavy)]">
          {eventCount > 0 && <span>{eventCount} events</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent-dim)]">0G</span>
          <span className="text-[var(--border-heavy)]">|</span>
          <span className="text-[var(--accent-dim)]">AXL</span>
          <span className="text-[var(--border-heavy)]">|</span>
          <span className="text-[var(--accent-dim)]">x402</span>
        </div>
      </div>
    </header>
  );
}
