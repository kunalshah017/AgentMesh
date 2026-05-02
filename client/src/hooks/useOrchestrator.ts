"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  [key: string]: unknown;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "demo";

interface UseOrchestratorReturn {
  status: ConnectionStatus;
  events: AgentEvent[];
  sendGoal: (goal: string) => void;
  clearEvents: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Simulated demo flow for when backend is unavailable
function createDemoFlow(goal: string): { event: AgentEvent; delay: number }[] {
  return [
    {
      delay: 300,
      event: {
        type: "system",
        message: "🔗 Resolving tools from ENS: agent-mesh.eth",
      },
    },
    {
      delay: 800,
      event: {
        type: "tool_discovered",
        tool: {
          name: "Researcher",
          ensName: "researcher.agent-mesh.eth",
          pricePerCall: "0.01",
        },
      },
    },
    {
      delay: 400,
      event: {
        type: "tool_discovered",
        tool: {
          name: "Executor",
          ensName: "executor.agent-mesh.eth",
          pricePerCall: "0.05",
        },
      },
    },
    {
      delay: 400,
      event: {
        type: "tool_discovered",
        tool: {
          name: "Analyst",
          ensName: "analyst.agent-mesh.eth",
          pricePerCall: "0.02",
        },
      },
    },
    {
      delay: 400,
      event: {
        type: "tool_discovered",
        tool: {
          name: "Gas-optimizer",
          ensName: "gas-optimizer.agent-mesh.eth",
          pricePerCall: "0.01",
        },
      },
    },
    {
      delay: 600,
      event: {
        type: "task_created",
        task: { id: "demo-1", goal, status: "in-progress" },
      },
    },
    {
      delay: 1000,
      event: {
        type: "subtask_started",
        subtask: {
          tool: "researcher.agent-mesh.eth",
          capability: "defi-research",
          status: "running",
        },
      },
    },
    {
      delay: 500,
      event: {
        type: "payment_sent",
        payment: {
          amount: "0.01",
          to: "researcher.agent-mesh.eth",
          network: "Base Sepolia",
          token: "USDC",
        },
      },
    },
    {
      delay: 1200,
      event: {
        type: "subtask_completed",
        subtask: {
          tool: "researcher.agent-mesh.eth",
          result: "Found 3 DEX pools with >$1M TVL",
        },
      },
    },
    {
      delay: 600,
      event: {
        type: "reputation_recorded",
        agent: "researcher.agent-mesh.eth",
        chain: "0G Chain",
        success: true,
      },
    },
    {
      delay: 800,
      event: {
        type: "subtask_started",
        subtask: {
          tool: "analyst.agent-mesh.eth",
          capability: "risk-analysis",
          status: "running",
        },
      },
    },
    {
      delay: 500,
      event: {
        type: "payment_sent",
        payment: {
          amount: "0.02",
          to: "analyst.agent-mesh.eth",
          network: "Base Sepolia",
          token: "USDC",
        },
      },
    },
    {
      delay: 1000,
      event: {
        type: "subtask_completed",
        subtask: {
          tool: "analyst.agent-mesh.eth",
          result: "Risk score: LOW (0.12). Slippage < 0.3%",
        },
      },
    },
    {
      delay: 600,
      event: {
        type: "reputation_recorded",
        agent: "analyst.agent-mesh.eth",
        chain: "0G Chain",
        success: true,
      },
    },
    {
      delay: 800,
      event: {
        type: "subtask_started",
        subtask: {
          tool: "executor.agent-mesh.eth",
          capability: "execute-swap",
          status: "running",
        },
      },
    },
    {
      delay: 500,
      event: {
        type: "payment_sent",
        payment: {
          amount: "0.05",
          to: "executor.agent-mesh.eth",
          network: "Base Sepolia",
          token: "USDC",
        },
      },
    },
    {
      delay: 1500,
      event: {
        type: "subtask_completed",
        subtask: {
          tool: "executor.agent-mesh.eth",
          result: "Swap routed: 1 ETH → 2,304 USDC via Uniswap V3",
        },
      },
    },
    {
      delay: 600,
      event: {
        type: "reputation_recorded",
        agent: "executor.agent-mesh.eth",
        chain: "0G Chain",
        success: true,
      },
    },
    {
      delay: 500,
      event: {
        type: "task_completed",
        task: {
          id: "demo-1",
          goal,
          status: "completed",
          totalCost: "0.08 USDC",
        },
      },
    },
  ];
}

export function useOrchestrator(): UseOrchestratorReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
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

      // Demo mode: simulate full orchestration flow
      setStatus("demo");
      addEvent({ type: "system", message: `🎯 Goal: "${goal}"` });
      const flow = createDemoFlow(goal);
      let cumulative = 0;
      demoTimers.current = flow.map(({ event, delay }) => {
        cumulative += delay;
        return setTimeout(() => addEvent(event), cumulative);
      });
    },
    [addEvent],
  );

  const clearEvents = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setEvents([]);
  }, []);

  return { status, events, sendGoal, clearEvents };
}
