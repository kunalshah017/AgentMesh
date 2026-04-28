// Researcher Tool Provider - Main Entry Point
// Exposes MCP services: defi-scan, token-info, protocol-stats

import { createMCPServer } from "./mcp-server.js";
import { AXL_PORTS } from "@agentmesh/shared";

const PORT = parseInt(process.env.RESEARCHER_PORT ?? "3002", 10);
const AXL_PORT = AXL_PORTS.researcher;

async function main() {
  console.log("🔬 Starting Researcher Tool Provider...");
  console.log(`   MCP Server: http://localhost:${PORT}`);
  console.log(`   AXL Node:   http://localhost:${AXL_PORT}`);

  const server = createMCPServer(PORT);

  server.listen(PORT, () => {
    console.log(`✅ Researcher ready on port ${PORT}`);
    console.log("   Services: defi-scan, token-info, protocol-stats");
  });
}

main().catch((err) => {
  console.error("❌ Researcher failed to start:", err);
  process.exit(1);
});
