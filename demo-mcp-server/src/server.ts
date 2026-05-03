// Demo MCP Server — NFT Collection Info
// A standalone MCP-compliant HTTP server with NFT tools.
// Returns collection stats + images that render in AgentMesh chat.

import express from "express";
import { nftCollectionInfo } from "./tools.js";

const PORT = parseInt(process.env.PORT ?? "4001", 10);
const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// ─── MCP Tool Definitions ───
const MCP_TOOLS = [
  {
    name: "nft-collection-info",
    description:
      "Get NFT collection stats, floor price, supply, and images. Search by name (e.g. 'bored ape', 'azuki', 'pudgy penguins'). Returns images that render in chat.",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description:
            "Collection name or keyword to search (e.g. 'bayc', 'azuki', 'punks'). Leave empty to see all popular collections.",
        },
      },
    },
    example: "Get stats and floor price for the Pudgy Penguins collection",
    keywords: "nft, collection, floor price, images, ethereum, metadata",
  },
];

// ─── Health ───
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    provider: "nft-collection-info",
    tools: MCP_TOOLS.length,
    timestamp: Date.now(),
  });
});

// ─── x402 pricing discovery ───
app.get("/.well-known/x402.json", (_req, res) => {
  res.json({
    accepts: ["USDC"],
    network: "base-sepolia",
    price: "0.02",
    description: "NFT Collection Info MCP Provider — $0.02 USDC per tool call",
    payTo:
      process.env.PROVIDER_WALLET ??
      "0x0000000000000000000000000000000000000000",
  });
});

// ─── MCP JSON-RPC Endpoint ───
app.post("/mcp", async (req, res) => {
  const body = req.body as {
    jsonrpc?: string;
    method?: string;
    id?: number | string;
    params?: Record<string, unknown>;
  };

  if (body.jsonrpc !== "2.0" || !body.method) {
    res.status(400).json({
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC request" },
    });
    return;
  }

  const id = body.id ?? 1;

  switch (body.method) {
    case "initialize":
      res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "nft-collection-info", version: "1.0.0" },
        },
      });
      break;

    case "tools/list":
      res.json({ jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
      break;

    case "tools/call": {
      const params = body.params as
        | { name?: string; arguments?: Record<string, string> }
        | undefined;
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      if (!toolName) {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Missing tool name" },
        });
        return;
      }

      if (toolName === "nft-collection-info") {
        const result = await nftCollectionInfo(
          args as Parameters<typeof nftCollectionInfo>[0],
        );
        res.json({ jsonrpc: "2.0", id, result });
      } else {
        res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        });
      }
      break;
    }

    default:
      res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${body.method}` },
      });
  }
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`\n🖼️  NFT Collection Info MCP Provider`);
  console.log(`   Port: ${PORT}`);
  console.log(`   MCP: http://localhost:${PORT}/mcp`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`\n   Tools:`);
  MCP_TOOLS.forEach((t) => console.log(`     • ${t.name}`));
  console.log(`\n   Ready to publish on AgentMesh! 🚀\n`);
});
