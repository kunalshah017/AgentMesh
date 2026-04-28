// Risk Analyst Tool Provider - Main Entry Point
// Exposes MCP services: risk-assess, contract-audit, portfolio-risk

import { createMCPServer } from "./mcp-server.js";
import { AXL_PORTS } from "@agentmesh/shared";

const PORT = parseInt(process.env.RISK_ANALYST_PORT ?? "3003", 10);
const AXL_PORT = AXL_PORTS.riskAnalyst;

async function main() {
  console.log("🛡️  Starting Risk Analyst Tool Provider...");
  console.log(`   MCP Server: http://localhost:${PORT}`);
  console.log(`   AXL Node:   http://localhost:${AXL_PORT}`);

  const server = createMCPServer(PORT);

  server.listen(PORT, () => {
    console.log(`✅ Risk Analyst ready on port ${PORT}`);
    console.log("   Services: risk-assess, contract-audit, portfolio-risk");
  });
}

main().catch((err) => {
  console.error("❌ Risk Analyst failed to start:", err);
  process.exit(1);
});
