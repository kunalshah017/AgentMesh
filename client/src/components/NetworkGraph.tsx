"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { useCatalog } from "@/hooks/useCatalog";
import dynamic from "next/dynamic";

// Force-graph uses canvas APIs — must be client-only
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── palette / icons ──────────────────────────────────────────── */
const PROVIDER_COLORS = [
  "#FF6B6B", "#00aaff", "#FFD93D", "#C4B5FD", "#6EE7B7",
  "#F472B6", "#FB923C", "#38BDF8", "#A3E635", "#E879F9",
];
const TOOL_ICONS: Record<string, string> = {
  "scan-yields": "📊", "token-info": "💰", "protocol-stats": "📈",
  "risk-assess": "⚠️", "contract-audit": "🔒", "execute-swap": "💱",
  "execute-deposit": "📥", "check-balance": "🏦", "pay-with-any-token": "💳",
};
const ORCHESTRATOR_COLOR = "#FF6B6B";

/* ── types ─────────────────────────────────────────────────────── */
interface GraphNode {
  id: string;
  label: string;
  icon: string;
  color: string;
  group: string;
  nodeType: "orchestrator" | "provider" | "tool";
  toolCount?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  toolName?: string;
}

interface NetworkGraphProps {
  activeTools: Set<string>;
  toolActions: Map<string, string>;
}

function shortLabel(name: string) {
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ================================================================ */

export function NetworkGraph({ activeTools, toolActions }: NetworkGraphProps) {
  const catalog = useCatalog();
  const fgRef = useRef<any>(null);  // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 400 });

  /* ── resize observer ─────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── build graph data from catalog ───────────────────────────── */
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Orchestrator hub
    nodes.push({
      id: "__orchestrator__",
      label: "ORCHESTRATOR",
      icon: "🧠",
      color: ORCHESTRATOR_COLOR,
      group: "__orchestrator__",
      nodeType: "orchestrator",
    });

    catalog.providers.forEach((prov, pi) => {
      const pColor = PROVIDER_COLORS[pi % PROVIDER_COLORS.length];
      const provId = `prov:${prov.ensName}`;

      nodes.push({
        id: provId,
        label: prov.name.toUpperCase(),
        icon: prov.status === "online" ? "✅" : "⚪",
        color: pColor,
        group: prov.ensName,
        nodeType: "provider",
        toolCount: prov.tools.length,
      });

      // Orchestrator → Provider
      links.push({ source: "__orchestrator__", target: provId });

      // Tools
      prov.tools.forEach((tool) => {
        const toolId = `tool:${tool.name}`;
        nodes.push({
          id: toolId,
          label: shortLabel(tool.name),
          icon: TOOL_ICONS[tool.name] ?? "⚡",
          color: pColor,
          group: prov.ensName,
          nodeType: "tool",
        });
        links.push({ source: provId, target: toolId, toolName: tool.name });
      });
    });

    return { nodes, links };
  }, [catalog.providers]);

  /* ── fit to view after data loads ────────────────────────────── */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || graphData.nodes.length === 0) return;
    const t = setTimeout(() => fg.zoomToFit(400, 40), 500);
    return () => clearTimeout(t);
  }, [graphData]);

  /* ── custom node painting ────────────────────────────────────── */
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      const toolName = n.id.startsWith("tool:") ? n.id.slice(5) : "";
      const isActive =
        n.nodeType === "orchestrator"
          ? activeTools.size > 0
          : activeTools.has(toolName) || activeTools.has(n.id);

      // Sizing
      const fontSize = n.nodeType === "orchestrator" ? 12 : n.nodeType === "provider" ? 11 : 10;
      const labelFont = `900 ${fontSize}px 'Space Grotesk', sans-serif`;
      const iconSize = n.nodeType === "orchestrator" ? 16 : 13;

      ctx.font = labelFont;
      const labelW = ctx.measureText(n.label).width;
      const padX = 12;
      const padY = 8;
      const iconW = iconSize + 4;
      const cardW = iconW + labelW + padX * 2;
      const cardH = (n.nodeType === "provider" ? fontSize + 18 : fontSize + 12) + padY;

      const x = (node.x ?? 0) - cardW / 2;
      const y = (node.y ?? 0) - cardH / 2;

      // Shadow
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 2, y + 2, cardW, cardH);

      // Card background
      ctx.fillStyle = isActive ? n.color : "#fff";
      ctx.fillRect(x, y, cardW, cardH);

      // Border
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeRect(x, y, cardW, cardH);

      // Icon
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      const centerY = n.nodeType === "provider" ? (node.y ?? 0) - 4 : (node.y ?? 0);
      ctx.fillText(n.icon, x + padX - 2, centerY);

      // Label
      ctx.font = labelFont;
      ctx.fillStyle = "#000";
      ctx.fillText(n.label, x + padX + iconW, centerY);

      // Sub-label for providers
      if (n.nodeType === "provider" && n.toolCount) {
        ctx.font = `bold ${fontSize - 2}px 'Space Grotesk', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText(`${n.toolCount} tools`, node.x ?? 0, (node.y ?? 0) + fontSize - 1);
      }

      // Active pulse
      if (isActive) {
        const pulse = 0.3 + 0.3 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.globalAlpha = pulse;
        ctx.strokeRect(x - 3, y - 3, cardW + 6, cardH + 6);
        ctx.globalAlpha = 1;
      }
    },
    [activeTools],
  );

  /* ── pointer area for hit-testing ────────────────────────────── */
  const paintNodeArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode;
      const fontSize = n.nodeType === "orchestrator" ? 12 : n.nodeType === "provider" ? 11 : 10;
      const labelFont = `900 ${fontSize}px 'Space Grotesk', sans-serif`;
      const iconSize = n.nodeType === "orchestrator" ? 16 : 13;
      ctx.font = labelFont;
      const labelW = ctx.measureText(n.label).width;
      const padX = 12;
      const padY = 8;
      const iconW = iconSize + 4;
      const cardW = iconW + labelW + padX * 2;
      const cardH = (n.nodeType === "provider" ? fontSize + 18 : fontSize + 12) + padY;
      ctx.fillStyle = color;
      ctx.fillRect((node.x ?? 0) - cardW / 2, (node.y ?? 0) - cardH / 2, cardW, cardH);
    },
    [],
  );

  /* ── link styling ────────────────────────────────────────────── */
  const linkColor = useCallback(
    (link: any) => {
      const l = link as GraphLink;
      if (l.toolName && activeTools.has(l.toolName)) return "rgba(0,0,0,0.8)";
      return "rgba(0,0,0,0.12)";
    },
    [activeTools],
  );

  const linkWidth = useCallback(
    (link: any) => {
      const l = link as GraphLink;
      if (l.toolName && activeTools.has(l.toolName)) return 2.5;
      return 1;
    },
    [activeTools],
  );

  const linkDash = useCallback(
    (link: any) => {
      const l = link as GraphLink;
      if (l.toolName && activeTools.has(l.toolName)) return null;
      return [4, 4];
    },
    [activeTools],
  );

  const linkParticles = useCallback(
    (link: any) => {
      const l = link as GraphLink;
      if (l.toolName && activeTools.has(l.toolName)) return 3;
      return 0;
    },
    [activeTools],
  );

  const linkParticleColor = useCallback(
    (link: any) => {
      // Find the target node's color
      const l = link as GraphLink;
      const targetId = typeof l.target === "object" ? (l.target as any).id : l.target;
      const targetNode = graphData.nodes.find((n) => n.id === targetId);
      return targetNode?.color ?? "#000";
    },
    [graphData.nodes],
  );

  const linkLabel = useCallback(
    (link: any) => {
      const l = link as GraphLink;
      if (l.toolName && activeTools.has(l.toolName)) {
        const action = toolActions.get(l.toolName);
        if (action) return `<span style="background:#000;color:#fff;padding:2px 6px;font:bold 10px 'Space Grotesk',sans-serif;border-radius:2px">${action}</span>`;
      }
      return "";
    },
    [activeTools, toolActions],
  );

  /* ── node drag: fix in place after drag ──────────────────────── */
  const onNodeDragEnd = useCallback((node: any) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const onNodeClick = useCallback((node: any) => {
    // Un-fix on click so it can rejoin the simulation
    node.fx = undefined;
    node.fy = undefined;
  }, []);

  const activeCount = useMemo(() => {
    let c = 0;
    for (const n of graphData.nodes) {
      const toolName = n.id.startsWith("tool:") ? n.id.slice(5) : "";
      if (n.nodeType === "orchestrator" ? activeTools.size > 0 : activeTools.has(toolName)) c++;
    }
    return c;
  }, [graphData.nodes, activeTools]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header bar */}
      <div className="px-4 py-3 border-b-4 border-black bg-neo-white flex items-center justify-between shrink-0">
        <h2 className="text-sm font-black uppercase tracking-wider">
          P2P MESH NETWORK
          <span className="ml-2 bg-black text-neo-white px-2 py-0.5 text-[10px] font-black">MCP</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="bg-neo-secondary border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase">
            ON-CHAIN ✓
          </span>
          <span className="mono text-xs font-black">
            {activeCount > 0 ? `${activeCount} ACTIVE` : "IDLE"}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative bg-neo-bg min-h-0 overflow-hidden">
        {dimensions.w > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            backgroundColor="transparent"
            // Node rendering
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={paintNodeArea}
            // Link rendering
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkLineDash={linkDash}
            linkDirectionalParticles={linkParticles}
            linkDirectionalParticleWidth={3}
            linkDirectionalParticleSpeed={0.008}
            linkDirectionalParticleColor={linkParticleColor}
            linkLabel={linkLabel}
            // Interaction
            enableNodeDrag={true}
            onNodeDragEnd={onNodeDragEnd}
            onNodeClick={onNodeClick}
            // Simulation
            cooldownTicks={100}
            d3VelocityDecay={0.3}
            // Disable zoom scroll to avoid conflict with page scroll
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        )}
      </div>
    </div>
  );
}
