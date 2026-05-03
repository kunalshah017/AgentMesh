// Orchestrator Agent - Main Entry Point
// The central coordinator with LLM reasoning (0G Compute)

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from repo root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createServer } from "./server.js";
import { OrchestratorAgent } from "./agent.js";
import { LocalToolRouter } from "./local-router.js";
import { AXL_PORTS } from "@agentmesh/shared";
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
  payWithAnyToken,
} from "@agentmesh/executor/tools";

const PORT = parseInt(
  process.env.PORT ?? process.env.ORCHESTRATOR_PORT ?? "3001",
  10,
);
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
    walletAddress: process.env.ORCHESTRATOR_WALLET ?? undefined,
  });

  // --- Helpers to extract structured args from subtask description text ---
  function extractChain(task?: string): string | undefined {
    if (!task) return undefined;
    const t = task.toLowerCase();
    const chains: Array<[RegExp, string]> = [
      [/base\s*sepolia/i, "base-sepolia"],
      [/\bsepolia\b/i, "sepolia"],
      [/\bbase\b/i, "base"],
      [/\barbitrum\b/i, "arbitrum"],
      [/\boptimism\b/i, "optimism"],
      [/\bpolygon\b|\bmatic\b/i, "polygon"],
      [/\bavalanche\b|\bavax\b/i, "avalanche"],
      [/\bethereum\b|\bmainnet\b/i, "ethereum"],
    ];
    for (const [re, chain] of chains) {
      if (re.test(task)) return chain;
    }
    return undefined;
  }

  function extractToken(task?: string): string | undefined {
    if (!task) return undefined;
    const match = task.match(
      /\b(ETH|WETH|USDC|USDT|DAI|WBTC|stETH|UNI|ARB|OP|MATIC|AVAX|cbETH)\b/i,
    );
    return match ? match[1].toUpperCase() : undefined;
  }

  function extractTokenPair(task?: string): [string, string] | undefined {
    if (!task) return undefined;
    // "swap X ETH to USDC" or "ETH → USDC" or "ETH for USDC"
    const match = task.match(
      /\b(ETH|WETH|USDC|USDT|DAI|WBTC|stETH|UNI)\b\s*(?:to|→|->|for|into)\s*\b(ETH|WETH|USDC|USDT|DAI|WBTC|stETH|UNI)\b/i,
    );
    if (match) return [match[1].toUpperCase(), match[2].toUpperCase()];
    return undefined;
  }

  function extractAmount(task?: string): string | undefined {
    if (!task) return undefined;
    const match = task.match(
      /(\d+(?:\.\d+)?)\s*(?:ETH|WETH|USDC|USDT|DAI|WBTC|stETH|UNI)/i,
    );
    return match ? match[1] : undefined;
  }

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
    router.register("execute-swap", (args) => {
      const chain = args.chain ?? extractChain(args.task);
      const tokenIn = args.tokenIn ?? extractTokenPair(args.task)?.[0] ?? "ETH";
      const tokenOut =
        args.tokenOut ?? extractTokenPair(args.task)?.[1] ?? "USDC";
      const amount = args.amount ?? extractAmount(args.task) ?? "1";
      return executeSwap(
        tokenIn,
        tokenOut,
        amount,
        chain,
        args.address || undefined,
      );
    });
    router.register("execute-deposit", (args) =>
      executeDeposit(
        args.protocol ?? "lido",
        args.token ?? "ETH",
        args.amount ?? "1",
      ),
    );
    router.register("check-balance", (args) => {
      const chain = args.chain ?? extractChain(args.task);
      const token = args.token ?? extractToken(args.task);
      return checkBalance(
        args.address ?? "0x0000000000000000000000000000000000000000",
        token,
        chain,
      );
    });
    router.register("pay-with-any-token", (args) =>
      payWithAnyToken(
        args.sourceToken ?? "ETH",
        args.amount ?? "0.05",
        args.chain,
      ),
    );

    agent.setLocalRouter(router);
    console.log(`   Tools: ${router.listTools().join(", ")}`);
  }

  // Discover tools from on-chain registry at startup
  console.log("   🔍 Discovering on-chain providers...");
  await agent.refreshRegistry();

  createServer(agent, PORT);
  console.log(`✅ Orchestrator ready on port ${PORT}`);
}

main().catch((err) => {
  console.error("❌ Orchestrator failed to start:", err);
  process.exit(1);
});
