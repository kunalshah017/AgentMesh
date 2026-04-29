"use client";

import { useRef, useEffect } from "react";
import type { AgentEvent } from "@/hooks/useOrchestrator";

interface ActivityFeedProps {
  events: AgentEvent[];
}

function eventColor(type: string): string {
  switch (type) {
    case "task_created": return "var(--accent)";
    case "tool_discovered": return "#00aaff";
    case "tool_called": return "#00aaff";
    case "payment_sent": return "var(--warning)";
    case "task_completed":
    case "task_result": return "var(--accent)";
    case "error": return "var(--danger)";
    case "system": return "var(--border-heavy)";
    default: return "var(--border-heavy)";
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
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)] flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider">
          ACTIVITY LOG
        </h2>
        <span className="mono text-xs text-[var(--border-heavy)]">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {events.length === 0 ? (
          <p className="mono text-xs text-[var(--border-heavy)]">
            Waiting for agent activity...
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 mono text-xs py-1"
              style={{ borderLeft: `3px solid ${eventColor(event.type)}`, paddingLeft: "8px" }}
            >
              <span className="text-[var(--border-heavy)] shrink-0 w-[70px]">
                {new Date((event._ts as number) ?? Date.now()).toLocaleTimeString()}
              </span>
              <span
                className="font-bold uppercase shrink-0 w-[110px]"
                style={{ color: eventColor(event.type) }}
              >
                {event.type.replace(/_/g, " ")}
              </span>
              <span className="text-[var(--fg)] truncate">
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
