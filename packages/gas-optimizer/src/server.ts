// Gas Optimizer MCP Server
// Runs as a standalone tool provider that can be registered on the AgentMesh marketplace

import express from "express";
import { x402PaymentGate } from "@agentmesh/shared";
import { predictGas } from "./index.js";

const PORT = parseInt(process.env.PORT ?? "9042");
const app = express();
app.use(express.json());

// x402 payment gate — charges per call
app.use(
  x402PaymentGate({
    paymentAddress: process.env.PAYMENT_ADDRESS ?? "0x4F3CBe03724a12C334B4bC751F53AA3f546Cd501",
    enforce: false, // Demo mode
  }),
);

// MCP tools/list
app.post("/mcp", (req, res) => {
  const body = req.body as { method?: string; id?: number };

  if (body.method === "tools/list") {
    res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            name: "predict-gas",
            description: "Predict optimal gas prices for Ethereum transactions using real network data",
            inputSchema: {
              type: "object",
              properties: {
                network: { type: "string", description: "Network name (ethereum, base, arbitrum)", default: "ethereum" },
              },
            },
          },
        ],
      },
    });
    return;
  }

  if (body.method === "tools/call") {
    const params = (body as any).params;
    const toolName = params?.name;

    if (toolName === "predict-gas") {
      const args = params?.arguments ?? {};
      predictGas(args.network)
        .then((result) => {
          res.json({ jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
        })
        .catch((err) => {
          res.json({ jsonrpc: "2.0", id: body.id, error: { code: -32000, message: String(err) } });
        });
      return;
    }

    res.json({ jsonrpc: "2.0", id: body.id, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
    return;
  }

  res.json({ jsonrpc: "2.0", id: body.id, error: { code: -32601, message: "Method not found" } });
});

app.listen(PORT, () => {
  console.log(`⛽ Gas Optimizer MCP server running on port ${PORT}`);
  console.log(`   Tools: predict-gas`);
  console.log(`   Register on marketplace: bun run packages/contracts/scripts/register-tool.ts`);
});
