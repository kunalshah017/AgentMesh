// Executor MCP Server

import express from "express";
import type { Server } from "http";
import type { MCPRequest, MCPResponse } from "@agentmesh/shared";
import { executeSwap } from "./tools/execute-swap.js";
import { executeDeposit } from "./tools/execute-deposit.js";
import { checkBalance } from "./tools/check-balance.js";

export function createMCPServer(port: number): Server {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const request = req.body as MCPRequest;

    if (request.method === "tools/list") {
      const response: MCPResponse = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [
            {
              name: "execute-swap",
              description: "Execute a token swap via Uniswap Trading API",
              inputSchema: {
                type: "object",
                properties: {
                  tokenIn: { type: "string", description: "Input token symbol" },
                  tokenOut: { type: "string", description: "Output token symbol" },
                  amount: { type: "string", description: "Amount to swap" },
                  chain: { type: "string", description: "Chain (default: ethereum)" },
                },
                required: ["tokenIn", "tokenOut", "amount"],
              },
            },
            {
              name: "execute-deposit",
              description: "Deposit tokens into a DeFi protocol via KeeperHub",
              inputSchema: {
                type: "object",
                properties: {
                  protocol: { type: "string", description: "Protocol name (e.g., Lido, Aave)" },
                  token: { type: "string", description: "Token to deposit" },
                  amount: { type: "string", description: "Amount to deposit" },
                },
                required: ["protocol", "token", "amount"],
              },
            },
            {
              name: "check-balance",
              description: "Check wallet token balances",
              inputSchema: {
                type: "object",
                properties: {
                  address: { type: "string", description: "Wallet address" },
                  token: { type: "string", description: "Token symbol (optional, defaults to ETH)" },
                },
                required: ["address"],
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
          case "execute-swap":
            result = await executeSwap(args.tokenIn, args.tokenOut, args.amount, args.chain);
            break;
          case "execute-deposit":
            result = await executeDeposit(args.protocol, args.token, args.amount);
            break;
          case "check-balance":
            result = await checkBalance(args.address, args.token);
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

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", agent: "executor", timestamp: Date.now() });
  });

  return app.listen(port);
}
