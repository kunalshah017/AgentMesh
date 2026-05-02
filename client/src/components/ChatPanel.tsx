"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { AgentEvent, ConnectionStatus } from "@/hooks/useOrchestrator";

interface ChatPanelProps {
  events: AgentEvent[];
  onSendGoal: (goal: string) => void;
  status: ConnectionStatus;
}

interface Message {
  role: "user" | "mesh" | "system";
  content: string;
  timestamp: number;
  eventType?: string;
}

function formatResult(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    return data
      .slice(0, 5)
      .map((item, i) => {
        if (typeof item === "object" && item !== null) {
          const o = item as Record<string, unknown>;
          const parts: string[] = [];
          for (const [k, v] of Object.entries(o)) {
            parts.push(`${k}: ${v}`);
          }
          return `  ${i + 1}. ${parts.join(" | ")}`;
        }
        return `  ${i + 1}. ${item}`;
      })
      .join("\n");
  }
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    return Object.entries(o)
      .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");
  }
  return JSON.stringify(data, null, 2);
}

export function ChatPanel({ events, onSendGoal, status }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userGoals, setUserGoals] = useState<{ goal: string; ts: number }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build chat messages from events + user goals
  const messages = useMemo(() => {
    const msgs: Message[] = [
      { role: "system", content: "AgentMesh ready. Enter a goal to begin orchestration.", timestamp: 0 },
    ];

    let goalIdx = 0;

    for (const event of events) {
      const ts = (event._ts as number) ?? Date.now();

      // Insert user goal messages in chronological order
      while (goalIdx < userGoals.length && userGoals[goalIdx].ts <= ts) {
        msgs.push({ role: "user", content: userGoals[goalIdx].goal, timestamp: userGoals[goalIdx].ts });
        goalIdx++;
      }

      switch (event.type) {
        case "system":
          msgs.push({ role: "system", content: String(event.message ?? ""), timestamp: ts });
          break;
        case "task_created":
          msgs.push({
            role: "mesh",
            content: `▸ Task created: ${(event.task as { goal?: string })?.goal ?? ""}`,
            timestamp: ts,
            eventType: "task",
          });
          break;
        case "tool_called":
          msgs.push({
            role: "mesh",
            content: `⚡ Calling ${event.tool} → ${event.method}`,
            timestamp: ts,
            eventType: "tool",
          });
          break;
        case "payment_sent": {
          const p = event.payment as { amount?: string; from?: string; to?: string; txHash?: string } | undefined;
          msgs.push({
            role: "mesh",
            content: `💰 Payment: ${p?.amount ?? "?"} USDC → ${p?.to ?? "?"}\n  tx: ${p?.txHash?.slice(0, 18) ?? "?"}...`,
            timestamp: ts,
            eventType: "payment",
          });
          break;
        }
        case "task_completed": {
          const task = (event.result ?? event.task) as { subtasks?: Array<{ description?: string; status?: string; result?: unknown }> } | undefined;
          if (task?.subtasks) {
            for (const sub of task.subtasks) {
              const statusIcon = sub.status === "completed" ? "✓" : sub.status === "failed" ? "✗" : "…";
              msgs.push({
                role: "mesh",
                content: `${statusIcon} ${sub.description}\n${sub.result ? formatResult(sub.result) : ""}`,
                timestamp: ts,
                eventType: sub.status === "completed" ? "success" : "error",
              });
            }
          }
          msgs.push({
            role: "mesh",
            content: "━━━ Task complete ━━━",
            timestamp: ts,
            eventType: "done",
          });
          break;
        }
        case "task_result": {
          const task = event.task as { subtasks?: Array<{ description?: string; status?: string; result?: unknown }> } | undefined;
          if (task?.subtasks) {
            for (const sub of task.subtasks) {
              const statusIcon = sub.status === "completed" ? "✓" : sub.status === "failed" ? "✗" : "…";
              msgs.push({
                role: "mesh",
                content: `${statusIcon} ${sub.description}\n${sub.result ? formatResult(sub.result) : ""}`,
                timestamp: ts,
                eventType: sub.status === "completed" ? "success" : "error",
              });
            }
          }
          msgs.push({
            role: "mesh",
            content: "━━━ Task complete ━━━",
            timestamp: ts,
            eventType: "done",
          });
          break;
        }
        case "error":
          msgs.push({
            role: "mesh",
            content: `⚠ ${event.message}`,
            timestamp: ts,
            eventType: "error",
          });
          break;
      }
    }

    // Append remaining user goals
    while (goalIdx < userGoals.length) {
      msgs.push({ role: "user", content: userGoals[goalIdx].goal, timestamp: userGoals[goalIdx].ts });
      goalIdx++;
    }

    return msgs;
  }, [events, userGoals]);

  // Track loading state from events
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === "task_completed" || lastEvent?.type === "task_result" || lastEvent?.type === "error") {
      setLoading(false);
    }
  }, [events]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendGoal = () => {
    if (!input.trim() || loading) return;
    const goal = input.trim();
    setInput("");
    setUserGoals((prev) => [...prev, { goal, ts: Date.now() }]);
    setLoading(true);
    onSendGoal(goal);
  };

  const eventTypeStyle = (eventType?: string) => {
    switch (eventType) {
      case "tool": return "border-l-4 border-[#00aaff] pl-3 bg-[#00aaff10]";
      case "payment": return "border-l-4 border-neo-secondary pl-3 bg-[#FFD93D20]";
      case "success": return "border-l-4 border-neo-accent pl-3 bg-[#FF6B6B10]";
      case "error": return "border-l-4 border-black pl-3 bg-[#00000010]";
      case "done": return "text-center font-black";
      case "task": return "border-l-4 border-neo-accent pl-3 bg-neo-accent/10 font-bold";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="px-4 py-3 border-b-4 border-black bg-neo-accent flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-black">
          COMMAND INTERFACE
        </h2>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${status === "connected" || status === "demo" ? "active" : status === "connecting" ? "warning" : "error"}`} />
          <span className="text-xs font-black uppercase text-black">{status === "demo" ? "DEMO" : status}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neo-bg pattern-dots">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${msg.role === "user"
              ? "neo-card-sm bg-neo-secondary p-3"
              : msg.role === "system"
                ? "border-l-4 border-black pl-3 text-black/50 text-sm"
                : `neo-card-sm p-3 ${eventTypeStyle(msg.eventType)}`
              }`}
          >
            <div className="mono text-[10px] font-black mb-1 uppercase tracking-widest opacity-60">
              {msg.role === "user" ? "YOU" : msg.role === "system" ? "SYSTEM" : "MESH"}
            </div>
            <pre className="mono text-sm whitespace-pre-wrap break-words font-bold">{msg.content}</pre>
          </div>
        ))}
        {loading && (
          <div className="neo-card-sm bg-neo-muted p-3 animate-pulse">
            <div className="mono text-xs font-black uppercase tracking-widest">
              ▓▓▓ ORCHESTRATING...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t-4 border-black p-4 bg-neo-white">
        <div className="flex gap-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendGoal()}
            placeholder="Enter goal: Find me the best yield for 10 ETH..."
            className="neo-input flex-1 px-4 py-3 text-sm border-r-0"
            disabled={loading}
          />
          <button
            onClick={sendGoal}
            disabled={loading || !input.trim()}
            className="neo-btn bg-neo-accent text-black px-6 py-3 text-sm disabled:opacity-30"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
