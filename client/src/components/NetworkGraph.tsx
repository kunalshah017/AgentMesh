"use client";

const NODES = [
  { id: "orchestrator", label: "ORCHESTRATOR", x: 50, y: 25, color: "var(--accent)", role: "Brain (0G Compute)" },
  { id: "researcher", label: "RESEARCHER", x: 18, y: 72, color: "#00aaff", role: "DeFi Scanner" },
  { id: "risk-analyst", label: "RISK ANALYST", x: 50, y: 88, color: "#ffcc00", role: "Risk Assessment" },
  { id: "executor", label: "EXECUTOR", x: 82, y: 72, color: "#ff5555", role: "Onchain Execution" },
];

const CONNECTIONS = [
  { from: "orchestrator", to: "researcher" },
  { from: "orchestrator", to: "risk-analyst" },
  { from: "orchestrator", to: "executor" },
];

interface NetworkGraphProps {
  activeNodes: Set<string>;
}

export function NetworkGraph({ activeNodes }: NetworkGraphProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)] flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider">
          P2P MESH NETWORK
          <span className="ml-3 text-[var(--accent)] font-normal">via AXL</span>
        </h2>
        <span className="mono text-xs text-[var(--border-heavy)]">
          {activeNodes.size > 0 ? `${activeNodes.size} active` : "idle"}
        </span>
      </div>

      <div className="flex-1 relative bg-[var(--bg)]">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {NODES.map((node) => (
              <filter key={`glow-${node.id}`} id={`glow-${node.id}`}>
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Connection lines */}
          {CONNECTIONS.map((conn) => {
            const from = NODES.find((n) => n.id === conn.from)!;
            const to = NODES.find((n) => n.id === conn.to)!;
            const isActive = activeNodes.has(conn.from) || activeNodes.has(conn.to);
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isActive ? to.color : "var(--border)"}
                strokeWidth={isActive ? "0.5" : "0.3"}
                strokeDasharray={isActive ? "none" : "1,1"}
                opacity={isActive ? 1 : 0.4}
              >
                {isActive && (
                  <animate
                    attributeName="stroke-opacity"
                    values="0.4;1;0.4"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </line>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isActive = activeNodes.has(node.id);
            return (
              <g key={node.id} filter={isActive ? `url(#glow-${node.id})` : undefined}>
                {/* Outer ring (pulse when active) */}
                {isActive && (
                  <circle cx={node.x} cy={node.y} r="5.5" fill="none" stroke={node.color} strokeWidth="0.3" opacity="0.5">
                    <animate attributeName="r" values="4.5;6.5;4.5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="4"
                  fill="var(--bg)"
                  stroke={node.color}
                  strokeWidth={isActive ? "0.8" : "0.5"}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? "2" : "1.5"}
                  fill={node.color}
                  opacity={isActive ? 1 : 0.6}
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y - 6.5}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize="2.5"
                  fontWeight="bold"
                  fontFamily="var(--mono)"
                  opacity={isActive ? 1 : 0.7}
                >
                  {node.label}
                </text>

                {/* Role */}
                <text
                  x={node.x}
                  y={node.y + 7.5}
                  textAnchor="middle"
                  fill={isActive ? node.color : "var(--border-heavy)"}
                  fontSize="1.8"
                  fontFamily="var(--mono)"
                >
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
