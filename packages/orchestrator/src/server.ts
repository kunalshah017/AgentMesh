// Orchestrator HTTP + WebSocket Server

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { OrchestratorAgent } from "./agent.js";

export function createServer(agent: OrchestratorAgent, port: number): Server {
  const app = express();
  app.use(express.json());

  // CORS for frontend
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "orchestrator", timestamp: Date.now() });
  });

  // Submit a goal
  app.post("/goal", async (req, res) => {
    const { goal } = req.body as { goal?: string };
    if (!goal || typeof goal !== "string") {
      res.status(400).json({ error: "Missing 'goal' in request body" });
      return;
    }

    try {
      const task = await agent.processGoal(goal);
      res.json({ task });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // SSE event stream
  app.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const unsubscribe = agent.onEvent((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
    });
  });

  const server = app.listen(port);

  // WebSocket for real-time bidirectional communication
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("📡 Dashboard connected via WebSocket");

    const unsubscribe = agent.onEvent((event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as { type: string; goal?: string };
        if (message.type === "goal" && message.goal) {
          const task = await agent.processGoal(message.goal);
          ws.send(JSON.stringify({ type: "task_result", task }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: String(error) }));
      }
    });

    ws.on("close", () => {
      unsubscribe();
      console.log("📡 Dashboard disconnected");
    });
  });

  return server;
}
