"use client";

import { useRef, useEffect } from "react";
import type { AgentEvent } from "@/hooks/useOrchestrator";

interface ActivityFeedProps {
  events: AgentEvent[];
}

function eventColor(type: string): string {
  switch (type) {
    case "task_created": return "#FF6B6B";
    case "tool_discovered": return "#00aaff";
    case "tool_called": return "#00aaff";
    case "payment_sent": return "#FFD93D";
    case "task_completed":
    case "task_result": return "#FF6B6B";
    case "error": return "#000000";
    case "system": return "#C4B5FD";
    default: return "#C4B5FD";
  }
}

function eventBg(type: string): string {
  switch (type) {
    case "task_created": return "bg-neo-accent/10";
    case "tool_called": return "bg-[#00aaff10]";
    case "payment_sent": return "bg-neo-secondary/20";
    case "task_completed":
    case "task_result": return "bg-neo-accent/10";
    case "error": return "bg-black/5";
    default: return "";
  }
}

function eventSummary(event: AgentEvent): string {
  switch (event.type) {
    case "system": return String(event.message ?? "");
    case "task_created": return `Goal: ${(event.task as { goal?: string })?.goal ?? ""}`;
    case "tool_discovered": return `Discovered: ${(event.tool as { name?: string })?.name ?? ""}`;
    case "tool_called": return `${event.tool} → ${event.method}`;
    case "payment_sent": return `${(event.payment as { amount?: string })?.amount ?? "?"} USDC`;
    case "task_completed":
    case "task_result": return "Task finished";
    case "error": return String(event.message ?? "Error");
    default: return event.type;
  }
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b-4 border-black bg-neo-muted flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-black">
          ACTIVITY LOG
        </h2>
        <span className="bg-black text-neo-white px-2 py-0.5 text-[10px] font-black mono">
          {events.length} EVT
        </span>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-neo-bg">
        {events.length === 0 ? (
          <p className="mono text-xs font-bold text-black/40 p-4">
            Waiting for agent activity...
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 mono text-xs py-1.5 px-2 border-l-4 ${eventBg(event.type)}`}
              style={{ borderLeftColor: eventColor(event.type) }}
            >
              <span className="text-black/40 shrink-0 w-[65px] font-bold">
                {new Date((event._ts as number) ?? Date.now()).toLocaleTimeString()}
              </span>
              <span
                className="font-black uppercase shrink-0 w-[100px]"
                style={{ color: eventColor(event.type) }}
              >
                {event.type.replace(/_/g, " ")}
              </span>
              <span className="text-black font-bold truncate">
                {eventSummary(event)}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
