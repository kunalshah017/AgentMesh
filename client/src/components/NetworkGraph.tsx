"use client";

const NODES = [
  { id: "orchestrator", label: "ORCHESTRATOR", x: 50, y: 22, color: "#FF6B6B", role: "Brain (0G Compute)", icon: "🧠", sponsor: "0G" },
  { id: "researcher", label: "RESEARCHER", x: 16, y: 72, color: "#00aaff", role: "DeFi Scanner", icon: "🔍", sponsor: "Uniswap" },
  { id: "risk-analyst", label: "RISK ANALYST", x: 50, y: 88, color: "#FFD93D", role: "Risk Assessment", icon: "⚠️", sponsor: "0G" },
  { id: "executor", label: "EXECUTOR", x: 84, y: 72, color: "#C4B5FD", role: "Onchain Execution", icon: "🔧", sponsor: "KeeperHub" },
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
      {/* Header bar */}
      <div className="px-4 py-3 border-b-4 border-black bg-neo-white flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider">
          P2P MESH NETWORK
          <span className="ml-2 bg-black text-neo-white px-2 py-0.5 text-[10px] font-black">AXL</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="bg-neo-secondary border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase">
            ON-CHAIN ✓
          </span>
          <span className="mono text-xs font-black">
            {activeNodes.size > 0 ? `${activeNodes.size} ACTIVE` : "IDLE"}
          </span>
        </div>
      </div>

      {/* Graph area */}
      <div className="flex-1 relative bg-neo-bg pattern-grid">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection lines — thick and brutalist */}
          {CONNECTIONS.map((conn) => {
            const from = NODES.find((n) => n.id === conn.from)!;
            const to = NODES.find((n) => n.id === conn.to)!;
            const isActive = activeNodes.has(conn.from) || activeNodes.has(conn.to);
            return (
              <g key={`${conn.from}-${conn.to}`}>
                {/* Shadow line */}
                <line
                  x1={from.x + 0.4}
                  y1={from.y + 0.4}
                  x2={to.x + 0.4}
                  y2={to.y + 0.4}
                  stroke="#000"
                  strokeWidth={isActive ? "0.8" : "0.5"}
                  opacity={0.3}
                />
                {/* Main line */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isActive ? "#000" : "#000"}
                  strokeWidth={isActive ? "0.7" : "0.4"}
                  strokeDasharray={isActive ? "none" : "2,1"}
                  opacity={isActive ? 1 : 0.4}
                />
                {/* Data flow animation */}
                {isActive && (
                  <circle r="0.8" fill={to.color}>
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M${from.x},${from.y} L${to.x},${to.y}`}
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isActive = activeNodes.has(node.id);
            return (
              <g key={node.id}>
                {/* Node card shadow */}
                <rect
                  x={node.x - 8.5}
                  y={node.y - 5.5}
                  width="17"
                  height="11"
                  fill="#000"
                  rx="0"
                />
                {/* Node card */}
                <rect
                  x={node.x - 9}
                  y={node.y - 6}
                  width="17"
                  height="11"
                  fill={isActive ? node.color : "#fff"}
                  stroke="#000"
                  strokeWidth="0.6"
                  rx="0"
                />

                {/* Icon */}
                <text
                  x={node.x}
                  y={node.y - 1}
                  textAnchor="middle"
                  fontSize="3.5"
                  dominantBaseline="middle"
                >
                  {node.icon}
                </text>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 3.5}
                  textAnchor="middle"
                  fill="#000"
                  fontSize="1.8"
                  fontWeight="900"
                  fontFamily="'Space Grotesk', sans-serif"
                >
                  {node.label}
                </text>

                {/* Role below card */}
                <text
                  x={node.x}
                  y={node.y + 8}
                  textAnchor="middle"
                  fill="#000"
                  fontSize="1.4"
                  fontWeight="700"
                  fontFamily="'Space Grotesk', sans-serif"
                  opacity={0.6}
                >
                  {node.role}
                </text>

                {/* Sponsor badge */}
                <rect
                  x={node.x + 5}
                  y={node.y - 7.5}
                  width={node.sponsor.length * 1.6 + 2}
                  height="3"
                  fill={node.color}
                  stroke="#000"
                  strokeWidth="0.3"
                  transform={`rotate(3, ${node.x + 5}, ${node.y - 7.5})`}
                />
                <text
                  x={node.x + 6}
                  y={node.y - 5.7}
                  fill="#000"
                  fontSize="1.4"
                  fontWeight="900"
                  fontFamily="'Space Grotesk', sans-serif"
                  transform={`rotate(3, ${node.x + 5}, ${node.y - 7.5})`}
                >
                  {node.sponsor}
                </text>

                {/* Active pulse */}
                {isActive && (
                  <rect
                    x={node.x - 10}
                    y={node.y - 7}
                    width="19"
                    height="13"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="0.4"
                    rx="0"
                    opacity="0.6"
                  >
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
