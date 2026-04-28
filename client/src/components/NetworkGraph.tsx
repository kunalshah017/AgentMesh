"use client";

const NODES = [
  { id: "orchestrator", label: "ORCHESTRATOR", x: 50, y: 30, color: "var(--accent)", role: "Brain (0G Compute)" },
  { id: "researcher", label: "RESEARCHER", x: 20, y: 70, color: "#00aaff", role: "DeFi Scanner" },
  { id: "risk-analyst", label: "RISK ANALYST", x: 50, y: 85, color: "#ffcc00", role: "Risk Assessment" },
  { id: "executor", label: "EXECUTOR", x: 80, y: 70, color: "#ff5555", role: "Onchain Execution" },
];

const CONNECTIONS = [
  { from: "orchestrator", to: "researcher" },
  { from: "orchestrator", to: "risk-analyst" },
  { from: "orchestrator", to: "executor" },
];

export function NetworkGraph() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)]">
        <h2 className="text-sm font-black uppercase tracking-wider">
          P2P MESH NETWORK
          <span className="ml-3 text-[var(--accent)] font-normal">via AXL</span>
        </h2>
      </div>

      <div className="flex-1 relative bg-[var(--bg)]">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection lines */}
          {CONNECTIONS.map((conn) => {
            const from = NODES.find((n) => n.id === conn.from)!;
            const to = NODES.find((n) => n.id === conn.to)!;
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--border)"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => (
            <g key={node.id}>
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill="var(--bg)"
                stroke={node.color}
                strokeWidth="0.6"
              />
              <circle cx={node.x} cy={node.y} r="1.5" fill={node.color} />

              {/* Label */}
              <text
                x={node.x}
                y={node.y - 6}
                textAnchor="middle"
                fill={node.color}
                fontSize="2.5"
                fontWeight="bold"
                fontFamily="var(--mono)"
              >
                {node.label}
              </text>

              {/* Role */}
              <text
                x={node.x}
                y={node.y + 7}
                textAnchor="middle"
                fill="var(--border-heavy)"
                fontSize="1.8"
                fontFamily="var(--mono)"
              >
                {node.role}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
