// Risk Analyst MCP Server

import express from "express";
import type { Server } from "http";
import type { MCPRequest, MCPResponse } from "@agentmesh/shared";
import { assessRisk } from "./tools/risk-assess.js";
import { auditContract } from "./tools/contract-audit.js";

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
              name: "risk-assess",
              description: "Assess risk of a DeFi protocol or yield opportunity",
              inputSchema: {
                type: "object",
                properties: {
                  protocol: { type: "string", description: "Protocol name" },
                  apy: { type: "string", description: "APY percentage" },
                },
                required: ["protocol"],
              },
            },
            {
              name: "contract-audit",
              description: "Check smart contract audit status and known vulnerabilities",
              inputSchema: {
                type: "object",
                properties: {
                  protocol: { type: "string", description: "Protocol name" },
                  chain: { type: "string", description: "Chain name" },
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
          case "risk-assess":
            result = await assessRisk(args.protocol, args.apy);
            break;
          case "contract-audit":
            result = await auditContract(args.protocol, args.chain);
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
    res.json({ status: "ok", agent: "risk-analyst", timestamp: Date.now() });
  });

  return app.listen(port);
}
