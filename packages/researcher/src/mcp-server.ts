// Researcher MCP Server - Handles incoming tool calls via AXL

import express from "express";
import type { Server } from "http";
import type { MCPRequest, MCPResponse } from "@agentmesh/shared";
import { x402PaymentGate } from "@agentmesh/shared";
import { scanYields } from "./tools/defi-scan.js";
import { getTokenInfo } from "./tools/token-info.js";
import { getProtocolStats } from "./tools/protocol-stats.js";

const PAYMENT_ADDRESS =
  process.env.RESEARCHER_PAYMENT_ADDRESS ??
  "0x0000000000000000000000000000000000000001";

export function createMCPServer(port: number): Server {
  const app = express();
  app.use(express.json());

  // x402 payment gate — tools/call requires payment
  app.use(
    "/mcp",
    x402PaymentGate({
      paymentAddress: PAYMENT_ADDRESS,
      enforce: process.env.X402_ENFORCE === "true",
    }),
  );

  // MCP endpoint — handles JSON-RPC tool calls
  app.post("/mcp", async (req, res) => {
    const request = req.body as MCPRequest;

    if (request.method === "tools/list") {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "scan-yields",
              description: "Scan DeFi protocols for yield opportunities",
              inputSchema: {
                type: "object",
                properties: {
                  token: {
                    type: "string",
                    description: "Token symbol (e.g., ETH, USDC)",
                  },
                  amount: { type: "string", description: "Amount to invest" },
                },
                required: ["token"],
              },
            },
            {
              name: "token-info",
              description: "Get token price and market data",
              inputSchema: {
                type: "object",
                properties: {
                  token: { type: "string", description: "Token symbol" },
                },
                required: ["token"],
              },
            },
            {
              name: "protocol-stats",
              description: "Get protocol TVL, volume, and metrics",
              inputSchema: {
                type: "object",
                properties: {
                  protocol: {
                    type: "string",
                    description: "Protocol name (e.g., Aave, Lido)",
                  },
                },
                required: ["protocol"],
              },
            },
          ],
        },
      };
      res.json(response);
      return;
    }

    if (request.method === "tools/call") {
      const { name, arguments: args } = request.params as {
        name: string;
        arguments: Record<string, string>;
      };

      let result: unknown;

      try {
        switch (name) {
          case "scan-yields":
            result = await scanYields(args.token, args.amount);
            break;
          case "token-info":
            result = await getTokenInfo(args.token);
            break;
          case "protocol-stats":
            result = await getProtocolStats(args.protocol);
            break;
          default:
            res.json({
              jsonrpc: "2.0",
              id: request.id,
              error: { code: -32601, message: `Unknown tool: ${name}` },
            });
            return;
        }

        res.json({ jsonrpc: "2.0", id: request.id, result });
      } catch (error) {
        res.json({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32000, message: String(error) },
        });
      }
      return;
    }

    res.json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: `Unknown method: ${request.method}` },
    });
  });

  // Health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "researcher", timestamp: Date.now() });
  });

  return app.listen(port);
}
