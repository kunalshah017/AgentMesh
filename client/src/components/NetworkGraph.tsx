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
  group: string;
  pos: Vec2;
  vel: Vec2;
  /** Rest position — where the node wants to be */
  rest: Vec2;
  pinned: boolean;
  w: number;
  h: number;
  isOrchestrator?: boolean;
  isProvider?: boolean;
}

interface NetworkGraphProps {
  activeTools: Set<string>;
  toolActions: Map<string, string>;
}

/* ── helpers ───────────────────────────────────────────────────── */
function shortLabel(name: string) {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function circleLayout(cx: number, cy: number, r: number, n: number, startAngle = -Math.PI / 2): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/** Measure text width with a temporary canvas for accurate node sizing */
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, font: string): number {
  if (!measureCtx) {
    const c = document.createElement("canvas");
    measureCtx = c.getContext("2d")!;
  }
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
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
  const needsDrawRef = useRef(true);
  const [activeCount, setActiveCount] = useState(0);

  /* ── build nodes from catalog data ──────────────────────────── */
  const buildNodes = useCallback(
    (providers: CatalogProvider[], w: number, h: number): PhysicsNode[] => {
      const nodes: PhysicsNode[] = [];
      const cx = w / 2;
      const cy = h / 2;

      const ORCH_FONT = "900 11px 'Space Grotesk', sans-serif";
      const PROV_FONT = "900 10px 'Space Grotesk', sans-serif";
      const TOOL_FONT = "900 9px 'Space Grotesk', sans-serif";

      // Orchestrator
      const orchLabel = "ORCHESTRATOR";
      const orchW = Math.max(120, textWidth(orchLabel, ORCH_FONT) + 40);
      nodes.push({
        id: "__orchestrator__",
        label: orchLabel,
        icon: "🧠",
        color: ORCHESTRATOR_COLOR,
        group: "__orchestrator__",
        pos: { x: cx, y: cy },
        vel: { x: 0, y: 0 },
        rest: { x: cx, y: cy },
        pinned: false,
        w: orchW,
        h: 48,
        isOrchestrator: true,
      });

      const provRadius = Math.min(w, h) * 0.28;
      const provPositions = circleLayout(cx, cy, provRadius, providers.length);

      providers.forEach((prov, pi) => {
        const pColor = PROVIDER_COLORS[pi % PROVIDER_COLORS.length];
        const pp = provPositions[pi];
        const provId = `prov:${prov.ensName}`;
        const pLabel = prov.name.toUpperCase();
        const pW = Math.max(110, textWidth(pLabel, PROV_FONT) + 36);

        nodes.push({
          id: provId,
          label: pLabel,
          icon: prov.status === "online" ? "✅" : "⚪",
          color: pColor,
          group: prov.ensName,
          pos: { x: pp.x, y: pp.y },
          vel: { x: 0, y: 0 },
          rest: { x: pp.x, y: pp.y },
          pinned: false,
          w: pW,
          h: 42,
          isProvider: true,
        });

        const toolRadius = Math.min(w, h) * 0.15;
        const toolPositions = circleLayout(pp.x, pp.y, toolRadius, prov.tools.length, Math.atan2(pp.y - cy, pp.x - cx));

        prov.tools.forEach((tool, ti) => {
          const tp = toolPositions[ti];
          const tLabel = shortLabel(tool.name);
          const tW = Math.max(90, textWidth(tLabel, TOOL_FONT) + 32);
          nodes.push({
            id: `tool:${tool.name}`,
            label: tLabel,
            icon: TOOL_ICONS[tool.name] ?? "⚡",
            color: pColor,
            group: prov.ensName,
            pos: { x: tp.x, y: tp.y },
            vel: { x: 0, y: 0 },
            rest: { x: tp.x, y: tp.y },
            pinned: false,
            w: tW,
            h: 36,
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
    needsDrawRef.current = true;
  }, [catalog.providers, buildNodes]);

  /* ── spring physics: only active after a drag release ──────── */
  const tickPhysics = useCallback((): boolean => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return false;

    const SPRING = 0.08;
    const DAMPING = 0.65;
    const SETTLE_THRESHOLD = 0.15;
    let anyMoving = false;

    for (const node of nodes) {
      if (node.pinned) continue;

      // Spring back toward rest position
      const dx = node.rest.x - node.pos.x;
      const dy = node.rest.y - node.pos.y;

      node.vel.x = (node.vel.x + dx * SPRING) * DAMPING;
      node.vel.y = (node.vel.y + dy * SPRING) * DAMPING;

      // Only move if velocity is non-trivial
      if (Math.abs(node.vel.x) > SETTLE_THRESHOLD || Math.abs(node.vel.y) > SETTLE_THRESHOLD) {
        node.pos.x += node.vel.x;
        node.pos.y += node.vel.y;
        anyMoving = true;
      } else {
        // Snap to rest when settled
        node.vel.x = 0;
        node.vel.y = 0;
        node.pos.x = node.rest.x;
        node.pos.y = node.rest.y;
      }
    }

    return anyMoving;
  }, []);

  /* ── render one frame ────────────────────────────────────────── */
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
      if (!dragRef.current && nodesRef.current.length > 0) {
        nodesRef.current = buildNodes(catalog.providers, w, h);
      }
      needsDrawRef.current = true;
    }

    const stillMoving = tickPhysics();
    const hasActive = activeTools.size > 0;

    // Only redraw when something changed
    if (!needsDrawRef.current && !stillMoving && !dragRef.current && !hasActive) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }
    needsDrawRef.current = stillMoving || !!dragRef.current || hasActive;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    for (let gy = 0; gy < h; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

    const nodes = nodesRef.current;
    const orch = nodes.find((n) => n.isOrchestrator);

    // ── connections ──
    for (const node of nodes) {
      if (node.isOrchestrator) continue;
      let target: PhysicsNode | undefined;
      if (node.isProvider) target = orch;
      else target = nodes.find((n) => n.isProvider && n.group === node.group);
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

      // Animated packet
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

      // Action label
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

    // ── nodes ──
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

      // ── icon (left side) + label (right of icon), both centred vertically ──
      const iconFontSize = node.isOrchestrator ? 16 : node.isProvider ? 13 : 12;
      const labelFont = node.isOrchestrator
        ? "900 11px 'Space Grotesk', sans-serif"
        : node.isProvider
          ? "900 10px 'Space Grotesk', sans-serif"
          : "900 9px 'Space Grotesk', sans-serif";

      ctx.font = labelFont;
      const labelW = ctx.measureText(node.label).width;
      const iconW = iconFontSize + 2; // approximate emoji width
      const gap = 4;
      const totalW = iconW + gap + labelW;
      const startX = node.pos.x - totalW / 2;
      const centerY = node.isProvider ? node.pos.y - 3 : node.pos.y;

      // Icon
      ctx.font = `${iconFontSize}px serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#000";
      ctx.fillText(node.icon, startX, centerY);

      // Label
      ctx.font = labelFont;
      ctx.fillStyle = "#000";
      ctx.fillText(node.label, startX + iconW + gap, centerY);

      // Sub-label for providers (tool count)
      if (node.isProvider) {
        const provData = catalog.providers.find((p) => `prov:${p.ensName}` === node.id);
        if (provData) {
          ctx.font = "bold 8px 'Space Grotesk', sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillText(`${provData.tools.length} tools`, node.pos.x, node.pos.y + 12);
        }
      }

      // Active pulse
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
  }, [tickPhysics, activeTools, toolActions, catalog.providers, buildNodes]);

  /* ── start / stop animation ─────────────────────────────────── */
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* ── pointer events ─────────────────────────────────────────── */
  const hitTest = useCallback((mx: number, my: number): number => {
    const nodes = nodesRef.current;
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
    needsDrawRef.current = true;
  }, [hitTest, getCanvasPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) {
      const pos = getCanvasPos(e);
      const idx = hitTest(pos.x, pos.y);
      canvasRef.current!.style.cursor = idx >= 0 ? "grab" : "default";
      return;
    }
    const pos = getCanvasPos(e);
    const node = nodesRef.current[dragRef.current.nodeIdx];
    node.pos.x = pos.x - dragRef.current.offset.x;
    node.pos.y = pos.y - dragRef.current.offset.y;
    needsDrawRef.current = true;
  }, [hitTest, getCanvasPos]);

  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      const node = nodesRef.current[dragRef.current.nodeIdx];
      node.pinned = false;
      // Give it a velocity kick so it springs back wobbly
      node.vel.x = (node.rest.x - node.pos.x) * 0.15;
      node.vel.y = (node.rest.y - node.pos.y) * 0.15;
      dragRef.current = null;
      needsDrawRef.current = true;
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
