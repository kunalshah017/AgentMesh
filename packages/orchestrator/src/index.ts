// Orchestrator Agent - Main Entry Point
// The central coordinator with LLM reasoning (0G Compute)

import { createServer } from "./server.js";
import { OrchestratorAgent } from "./agent.js";
import { LocalToolRouter } from "./local-router.js";
import { AXL_PORTS, ENS_NAMES } from "@agentmesh/shared";
import {
  scanYields,
  getTokenInfo,
  getProtocolStats,
} from "@agentmesh/researcher/tools";
import { assessRisk, auditContract } from "@agentmesh/risk-analyst/tools";
import {
  executeSwap,
  executeDeposit,
  checkBalance,
} from "@agentmesh/executor/tools";

const PORT = parseInt(process.env.ORCHESTRATOR_PORT ?? "3001", 10);
const AXL_PORT = AXL_PORTS.orchestrator;
const LOCAL_MODE = process.env.LOCAL_MODE !== "false"; // Default: local mode ON

async function main() {
  console.log("🧠 Starting Orchestrator Agent...");
  console.log(`   HTTP API: http://localhost:${PORT}`);
  console.log(
    `   Mode: ${LOCAL_MODE ? "LOCAL (direct tool calls)" : "AXL (P2P mesh)"}`,
  );

  const agent = new OrchestratorAgent({
    axlPort: AXL_PORT,
    zgServiceUrl: process.env.ZG_SERVICE_URL ?? "https://inference-api.0g.ai",
    zgApiSecret: process.env.ZG_API_SECRET ?? "",
    localMode: LOCAL_MODE,
  });

  // Register tool providers
  agent.registerTool({
    name: "Researcher",
    ensName: ENS_NAMES.researcher,
    axlPeerKey: "researcher-key",
    capabilities: [
      "defi-research",
      "scan-yields",
      "token-info",
      "protocol-stats",
    ],
    pricePerCall: "0.01",
  });
  agent.registerTool({
    name: "Risk Analyst",
    ensName: ENS_NAMES.riskAnalyst,
    axlPeerKey: "risk-analyst-key",
    capabilities: ["risk-analysis", "risk-assess", "contract-audit"],
    pricePerCall: "0.03",
  });
  agent.registerTool({
    name: "Executor",
    ensName: ENS_NAMES.executor,
    axlPeerKey: "executor-key",
    capabilities: [
      "execution",
      "execute-swap",
      "execute-deposit",
      "check-balance",
    ],
    pricePerCall: "0.05",
  });

  // Set up local router for demo/dev mode
  if (LOCAL_MODE) {
    const router = new LocalToolRouter();
    router.register("scan-yields", (args) =>
      scanYields(args.token ?? "ETH", args.amount),
    );
    router.register("token-info", (args) => getTokenInfo(args.token ?? "ETH"));
    router.register("protocol-stats", (args) =>
      getProtocolStats(args.protocol ?? "lido"),
    );
    router.register("risk-assess", (args) =>
      assessRisk(args.protocol ?? "lido", args.apy),
    );
    router.register("contract-audit", (args) =>
      auditContract(args.protocol ?? "lido", args.chain),
    );
    router.register("execute-swap", (args) =>
      executeSwap(
        args.tokenIn ?? "ETH",
        args.tokenOut ?? "USDC",
        args.amount ?? "1",
      ),
    );
    router.register("execute-deposit", (args) =>
      executeDeposit(
        args.protocol ?? "lido",
        args.token ?? "ETH",
        args.amount ?? "1",
      ),
    );
    router.register("check-balance", (args) =>
      checkBalance(
        args.address ?? "0x0000000000000000000000000000000000000000",
        args.token,
      ),
    );
    agent.setLocalRouter(router);
    console.log(`   Tools: ${router.listTools().join(", ")}`);
  }

  createServer(agent, PORT);
  console.log(`✅ Orchestrator ready on port ${PORT}`);
}

main().catch((err) => {
  console.error("❌ Orchestrator failed to start:", err);
  process.exit(1);
});
