"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useCatalog, type CatalogProvider } from "@/hooks/useCatalog";

/* ── colour palette for providers / tools ─────────────────────── */
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
interface Vec2 { x: number; y: number }
interface PhysicsNode {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** provider ensName (tools) or "__orchestrator__" */
  group: string;
  pos: Vec2;
  vel: Vec2;
  /** fixed while dragging */
  pinned: boolean;
  w: number;
  h: number;
  isOrchestrator?: boolean;
  isProvider?: boolean;
}

interface NetworkGraphProps {
  activeTools: Set<string>;
  /** tool name → short action string shown on the connection line */
  toolActions: Map<string, string>;
}

/* ── helpers ───────────────────────────────────────────────────── */
function shortLabel(name: string) {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Arrange N items in a circle around a centre. */
function circleLayout(cx: number, cy: number, r: number, n: number, startAngle = -Math.PI / 2): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/* ================================================================
   NetworkGraph — dynamic, draggable mesh powered by catalog data
   ================================================================ */

export function NetworkGraph({ activeTools, toolActions }: NetworkGraphProps) {
  const catalog = useCatalog();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<PhysicsNode[]>([]);
  const dragRef = useRef<{ nodeIdx: number; offset: Vec2 } | null>(null);
  const animRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 600 });
  const [activeCount, setActiveCount] = useState(0);

  /* ── build nodes from catalog data ──────────────────────────── */
  const buildNodes = useCallback(
    (providers: CatalogProvider[], w: number, h: number): PhysicsNode[] => {
      const nodes: PhysicsNode[] = [];
      const cx = w / 2;
      const cy = h / 2;

      // Orchestrator — centre
      nodes.push({
        id: "__orchestrator__",
        label: "ORCHESTRATOR",
        icon: "🧠",
        color: ORCHESTRATOR_COLOR,
        group: "__orchestrator__",
        pos: { x: cx, y: cy },
        vel: { x: 0, y: 0 },
        pinned: false,
        w: 120,
        h: 52,
        isOrchestrator: true,
      });

      // One ring of provider hubs around centre
      const provRadius = Math.min(w, h) * 0.28;
      const provPositions = circleLayout(cx, cy, provRadius, providers.length);

      providers.forEach((prov, pi) => {
        const pColor = PROVIDER_COLORS[pi % PROVIDER_COLORS.length];
        const pp = provPositions[pi];
        const provId = `prov:${prov.ensName}`;

        nodes.push({
          id: provId,
          label: prov.name.toUpperCase(),
          icon: prov.status === "online" ? "✅" : "⚪",
          color: pColor,
          group: prov.ensName,
          pos: { x: pp.x, y: pp.y },
          vel: { x: 0, y: 0 },
          pinned: false,
          w: 110,
          h: 44,
          isProvider: true,
        });

        // Tool nodes around this provider
        const toolRadius = Math.min(w, h) * 0.15;
        const toolPositions = circleLayout(pp.x, pp.y, toolRadius, prov.tools.length, Math.atan2(pp.y - cy, pp.x - cx));

        prov.tools.forEach((tool, ti) => {
          const tp = toolPositions[ti];
          nodes.push({
            id: `tool:${tool.name}`,
            label: shortLabel(tool.name),
            icon: TOOL_ICONS[tool.name] ?? "⚡",
            color: pColor,
            group: prov.ensName,
            pos: { x: tp.x, y: tp.y },
            vel: { x: 0, y: 0 },
            pinned: false,
            w: 100,
            h: 38,
          });
        });
      });

      return nodes;
    },
    [],
  );

  /* ── (re)initialise when catalog changes ────────────────────── */
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    nodesRef.current = buildNodes(catalog.providers, w, h);
  }, [catalog.providers, buildNodes]);

  /* ── spring physics tick ────────────────────────────────────── */
  const tick = useCallback(() => {
    const nodes = nodesRef.current;
    const { w, h } = sizeRef.current;
    if (nodes.length === 0) return;

    const SPRING_K = 0.012;
    const DAMPING = 0.82;
    const REPEL = 8000;
    const PAD = 10;

    // Find orchestrator
    const orch = nodes.find((n) => n.isOrchestrator);

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.pinned) continue;
      let fx = 0;
      let fy = 0;

      // Repulsion from every other node
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        let dx = a.pos.x - b.pos.x;
        let dy = a.pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (a.w + b.w) / 2 + 10;
        if (dist < minDist) {
          const force = REPEL / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }

      // Spring toward rest position (orchestrator centre, providers around it)
      // Tools spring toward their provider
      if (a.isOrchestrator) {
        fx += (w / 2 - a.pos.x) * SPRING_K * 2;
        fy += (h / 2 - a.pos.y) * SPRING_K * 2;
      } else if (a.isProvider && orch) {
        // Spring to orchestrator
        fx += (orch.pos.x - a.pos.x) * SPRING_K * 0.3;
        fy += (orch.pos.y - a.pos.y) * SPRING_K * 0.3;
      } else {
        // Tool — spring to its provider
        const prov = nodes.find((n) => n.isProvider && n.group === a.group);
        if (prov) {
          fx += (prov.pos.x - a.pos.x) * SPRING_K * 0.5;
          fy += (prov.pos.y - a.pos.y) * SPRING_K * 0.5;
        }
      }

      a.vel.x = (a.vel.x + fx) * DAMPING;
      a.vel.y = (a.vel.y + fy) * DAMPING;
      a.pos.x += a.vel.x;
      a.pos.y += a.vel.y;

      // Keep inside bounds
      a.pos.x = Math.max(a.w / 2 + PAD, Math.min(w - a.w / 2 - PAD, a.pos.x));
      a.pos.y = Math.max(a.h / 2 + PAD, Math.min(h - a.h / 2 - PAD, a.pos.y));
    }
  }, []);

  /* ── render loop ─────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      sizeRef.current = { w, h };
      // Re-layout if size changed and no drag happening
      if (!dragRef.current && nodesRef.current.length > 0) {
        nodesRef.current = buildNodes(catalog.providers, w, h);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    tick();

    const nodes = nodesRef.current;
    const orch = nodes.find((n) => n.isOrchestrator);

    // ── draw connections ──
    for (const node of nodes) {
      if (node.isOrchestrator) continue;

      let target: PhysicsNode | undefined;
      if (node.isProvider) {
        target = orch;
      } else {
        target = nodes.find((n) => n.isProvider && n.group === node.group);
      }
      if (!target) continue;

      const toolName = node.id.startsWith("tool:") ? node.id.slice(5) : "";
      const isActive = activeTools.has(toolName) || activeTools.has(node.id);

      ctx.beginPath();
      ctx.moveTo(node.pos.x, node.pos.y);
      ctx.lineTo(target.pos.x, target.pos.y);
      ctx.strokeStyle = isActive ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.15)";
      ctx.lineWidth = isActive ? 2.5 : 1;
      if (!isActive) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Animated data packet on active connections
      if (isActive) {
        const t = (Date.now() % 2000) / 2000;
        const px = node.pos.x + (target.pos.x - node.pos.x) * t;
        const py = node.pos.y + (target.pos.y - node.pos.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Action label on active tool connections
      if (isActive && toolName) {
        const action = toolActions.get(toolName);
        if (action) {
          const mx = (node.pos.x + target.pos.x) / 2;
          const my = (node.pos.y + target.pos.y) / 2 - 8;
          ctx.font = "bold 9px 'Space Grotesk', sans-serif";
          const tw = ctx.measureText(action).width;
          ctx.fillStyle = "rgba(0,0,0,0.85)";
          ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 14);
          ctx.fillStyle = "#fff";
          ctx.fillText(action, mx - tw / 2, my + 2);
        }
      }
    }

    // ── draw nodes ──
    let activeC = 0;
    for (const node of nodes) {
      const toolName = node.id.startsWith("tool:") ? node.id.slice(5) : "";
      const isActive =
        node.isOrchestrator
          ? activeTools.size > 0
          : activeTools.has(toolName) || activeTools.has(node.id);
      if (isActive) activeC++;

      const x = node.pos.x - node.w / 2;
      const y = node.pos.y - node.h / 2;

      // Shadow
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 3, y + 3, node.w, node.h);

      // Card
      ctx.fillStyle = isActive ? node.color : "#fff";
      ctx.fillRect(x, y, node.w, node.h);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, node.w, node.h);

      // Icon + label
      ctx.font = `${node.isOrchestrator ? 18 : node.isProvider ? 14 : 13}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(node.icon, node.pos.x - node.w / 4 + 4, node.pos.y - 2);

      ctx.font = `900 ${node.isOrchestrator ? 11 : node.isProvider ? 10 : 9}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = "#000";
      ctx.fillText(node.label, node.pos.x + 10, node.pos.y - 2);

      // Status line for providers
      if (node.isProvider) {
        const provData = catalog.providers.find((p) => `prov:${p.ensName}` === node.id);
        if (provData) {
          ctx.font = "bold 8px 'Space Grotesk', sans-serif";
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillText(`${provData.tools.length} tools`, node.pos.x + 10, node.pos.y + 12);
        }
      }

      // Active pulse ring
      if (isActive) {
        const pulse = 0.3 + 0.3 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = pulse;
        ctx.strokeRect(x - 3, y - 3, node.w + 6, node.h + 6);
        ctx.globalAlpha = 1;
      }
    }
    setActiveCount(activeC);

    animRef.current = requestAnimationFrame(draw);
  }, [tick, activeTools, toolActions, catalog.providers, buildNodes]);

  /* ── start / stop animation ─────────────────────────────────── */
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* ── pointer events for dragging ────────────────────────────── */
  const hitTest = useCallback((mx: number, my: number): number => {
    const nodes = nodesRef.current;
    // Reverse order so topmost (last drawn) wins
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (
        mx >= n.pos.x - n.w / 2 &&
        mx <= n.pos.x + n.w / 2 &&
        my >= n.pos.y - n.h / 2 &&
        my <= n.pos.y + n.h / 2
      ) return i;
    }
    return -1;
  }, []);

  const getCanvasPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    const idx = hitTest(pos.x, pos.y);
    if (idx < 0) return;
    const node = nodesRef.current[idx];
    node.pinned = true;
    node.vel = { x: 0, y: 0 };
    dragRef.current = { nodeIdx: idx, offset: { x: pos.x - node.pos.x, y: pos.y - node.pos.y } };
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [hitTest, getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) {
      // Cursor hint
      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);
      canvasRef.current!.style.cursor = idx >= 0 ? "grab" : "default";
      return;
    }
    const pos = getCanvasPos(e);
    const node = nodesRef.current[dragRef.current.nodeIdx];
    node.pos.x = pos.x - dragRef.current.offset.x;
    node.pos.y = pos.y - dragRef.current.offset.y;
  }, [hitTest, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      nodesRef.current[dragRef.current.nodeIdx].pinned = false;
      dragRef.current = null;
    }
  }, []);

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

      {/* Canvas */}
      <div className="flex-1 relative bg-neo-bg min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </div>
  );
}
