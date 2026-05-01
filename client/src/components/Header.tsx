import type { ConnectionStatus } from "@/hooks/useOrchestrator";

interface HeaderProps {
  status: ConnectionStatus;
  eventCount: number;
}

export function Header({ status, eventCount }: HeaderProps) {
  return (
    <header className="h-20 flex items-center justify-between px-6 border-b-4 border-black bg-neo-white">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="bg-neo-accent border-4 border-black px-4 py-1 shadow-[4px_4px_0px_0px_#000] -rotate-1">
          <h1 className="text-2xl font-black tracking-tighter uppercase text-black">
            AGENT<span className="text-neo-white">MESH</span>
          </h1>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-black hidden md:inline">
          Decentralized Agent Marketplace
        </span>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={`neo-card-sm px-3 py-1.5 flex items-center gap-2 ${status === "connected" ? "bg-neo-secondary" : status === "connecting" ? "bg-neo-muted" : "bg-neo-white"
          }`}>
          <span className={`status-dot ${status === "connected" ? "active" : status === "connecting" ? "warning" : "error"}`} />
          <span className="mono text-xs font-black uppercase">
            {status === "connected" ? "LIVE" : status === "connecting" ? "..." : "OFF"}
          </span>
        </div>

        {/* Event counter */}
        {eventCount > 0 && (
          <div className="bg-black text-neo-white border-4 border-black px-3 py-1.5 mono text-xs font-black">
            {eventCount} EVT
          </div>
        )}

        {/* Sponsor stack */}
        <div className="hidden md:flex items-center gap-1">
          <span className="bg-neo-muted border-4 border-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">0G</span>
          <span className="bg-neo-secondary border-4 border-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">AXL</span>
          <span className="bg-neo-accent border-4 border-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">x402</span>
        </div>
      </div>
    </header>
  );
}
