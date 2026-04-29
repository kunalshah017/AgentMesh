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
        case "payment_sent":
          msgs.push({
            role: "mesh",
            content: `💰 Payment: ${(event.payment as { amount?: string })?.amount ?? "?"} USDC`,
            timestamp: ts,
            eventType: "payment",
          });
          break;
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
      case "tool": return "border-l-4 border-[#00aaff] pl-3";
      case "payment": return "border-l-4 border-[var(--warning)] pl-3";
      case "success": return "border-l-4 border-[var(--accent)] pl-3";
      case "error": return "border-l-4 border-[var(--danger)] pl-3";
      case "done": return "text-center text-[var(--border-heavy)]";
      case "task": return "border-l-4 border-[var(--accent)] pl-3 text-[var(--accent)]";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)] flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider">
          COMMAND INTERFACE
        </h2>
        <div className="flex items-center gap-2 mono text-xs">
          <span className={`status-dot ${status === "connected" ? "active" : status === "connecting" ? "warning" : "error"}`} />
          <span className="text-[var(--border-heavy)] uppercase">{status}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${msg.role === "user"
                ? "border-brutal-accent bg-[var(--surface)] p-3"
                : msg.role === "system"
                  ? "border-l-4 border-[var(--border)] pl-3 text-[var(--border-heavy)] text-sm"
                  : `bg-[var(--surface-raised)] p-3 ${eventTypeStyle(msg.eventType)}`
              }`}
          >
            <div className="mono text-xs text-[var(--border-heavy)] mb-1 uppercase">
              {msg.role === "user" ? "YOU" : msg.role === "system" ? "SYS" : "MESH"}
            </div>
            <pre className="mono text-sm whitespace-pre-wrap break-words">{msg.content}</pre>
          </div>
        ))}
        {loading && (
          <div className="border-brutal p-3 bg-[var(--surface)]">
            <div className="mono text-xs text-[var(--accent)] uppercase animate-pulse">
              ▓▓▓ ORCHESTRATING...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t-3 border-[var(--fg)] p-4 bg-[var(--surface)]">
        <div className="flex gap-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendGoal()}
            placeholder="Enter goal: Find me the best yield for 10 ETH..."
            className="flex-1 bg-[var(--bg)] border-3 border-[var(--fg)] border-r-0 px-4 py-3 mono text-sm text-[var(--fg)] placeholder:text-[var(--border)] outline-none focus:border-[var(--accent)]"
            disabled={loading}
          />
          <button
            onClick={sendGoal}
            disabled={loading || !input.trim()}
            className="bg-[var(--fg)] text-[var(--bg)] px-6 py-3 font-black uppercase text-sm tracking-wider border-3 border-[var(--fg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors disabled:opacity-30"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
