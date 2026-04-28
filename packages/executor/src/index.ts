// Executor Tool Provider - Main Entry Point
// Exposes MCP services: execute-swap, execute-deposit, check-balance
// Uses KeeperHub MCP + Uniswap Trading API

import { createMCPServer } from "./mcp-server.js";
import { AXL_PORTS } from "@agentmesh/shared";

const PORT = parseInt(process.env.EXECUTOR_PORT ?? "3004", 10);
const AXL_PORT = AXL_PORTS.executor;

async function main() {
  console.log("⚡ Starting Executor Tool Provider...");
  console.log(`   MCP Server: http://localhost:${PORT}`);
  console.log(`   AXL Node:   http://localhost:${AXL_PORT}`);

  const server = createMCPServer(PORT);

  server.listen(PORT, () => {
    console.log(`✅ Executor ready on port ${PORT}`);
    console.log("   Services: execute-swap, execute-deposit, check-balance");
  });
}

main().catch((err) => {
  console.error("❌ Executor failed to start:", err);
  process.exit(1);
});
