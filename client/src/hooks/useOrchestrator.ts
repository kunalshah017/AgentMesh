"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseOrchestratorReturn {
  status: ConnectionStatus;
  events: AgentEvent[];
  sendGoal: (goal: string) => void;
  clearEvents: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useOrchestrator(): UseOrchestratorReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const addEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => [...prev, { ...event, _ts: Date.now() }]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setStatus("connected");
      addEvent({ type: "system", message: "Connected to Orchestrator" });
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as AgentEvent;
        addEvent(event);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [addEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendGoal = useCallback(
    (goal: string) => {
      // Send via WebSocket for real-time event streaming
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "goal", goal }));
        return;
      }
      // Fallback: HTTP POST
      fetch(`${API_URL}/goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      })
        .then((r) => r.json())
        .then((data) => addEvent({ type: "task_result", ...(data as object) }))
        .catch(() => addEvent({ type: "error", message: "Connection failed" }));
    },
    [addEvent],
  );

  const clearEvents = useCallback(() => setEvents([]), []);

  return { status, events, sendGoal, clearEvents };
}
