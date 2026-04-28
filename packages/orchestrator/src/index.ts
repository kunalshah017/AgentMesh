// Orchestrator Agent - Main Entry Point
// The central coordinator with LLM reasoning (0G Compute)

import { createServer } from "./server.js";
import { OrchestratorAgent } from "./agent.js";
import { AXL_PORTS } from "@agentmesh/shared";

const PORT = parseInt(process.env.ORCHESTRATOR_PORT ?? "3001", 10);
const AXL_PORT = AXL_PORTS.orchestrator;

async function main() {
  console.log("🧠 Starting Orchestrator Agent...");
  console.log(`   HTTP API: http://localhost:${PORT}`);
  console.log(`   AXL Node: http://localhost:${AXL_PORT}`);

  const agent = new OrchestratorAgent({
    axlPort: AXL_PORT,
    zgServiceUrl: process.env.ZG_SERVICE_URL!,
    zgApiSecret: process.env.ZG_API_SECRET!,
  });

  const server = createServer(agent, PORT);

  server.listen(PORT, () => {
    console.log(`✅ Orchestrator ready on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Orchestrator failed to start:", err);
  process.exit(1);
});
