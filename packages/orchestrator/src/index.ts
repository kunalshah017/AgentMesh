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

  // Register AgentMesh as the default built-in provider (always present)
  agent.registerBuiltinProvider({
    name: "AgentMesh",
    ensName: "agent-mesh.eth",
    endpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
    categories: [
      "defi-research",
      "yield-scanning",
      "token-analysis",
      "risk-analysis",
      "contract-auditing",
      "execution",
      "token-swaps",
      "gas-prediction",
    ],
    tools: [
      {
        name: "scan-yields",
        description:
          "Scan DeFi protocols for the best yield opportunities on a given token",
        keywords: [
          "yields",
          "APY",
          "farming",
          "best returns",
          "interest rate",
          "earn",
        ],
        example:
          '"Show me yields for USDC" → [{"description": "Scan DeFi protocols for best USDC yield opportunities", "tool": "scan-yields"}]',
      },
      {
        name: "token-info",
        description:
          "Get real-time token price, market cap, and volume from CoinGecko",
        keywords: [
          "price",
          "value",
          "market cap",
          "volume",
          "token",
          "coin",
          "worth",
        ],
        example:
          '"What\'s the price of ETH?" → [{"description": "Get current ETH price and market data", "tool": "token-info"}]',
      },
      {
        name: "protocol-stats",
        description: "Get protocol TVL, volume, and statistics from DeFi Llama",
        keywords: [
          "protocol",
          "TVL",
          "stats",
          "compare",
          "info about",
          "details",
        ],
        example:
          '"Tell me about Aave" → [{"description": "Get Aave protocol stats and TVL", "tool": "protocol-stats"}]',
      },
      {
        name: "risk-assess",
        description: "Assess the risk level of a DeFi protocol",
        keywords: [
          "risk",
          "safe",
          "danger",
          "rug pull",
          "trustworthy",
          "reliable",
        ],
        example:
          '"How risky is Aave?" → [{"description": "Assess risk profile of Aave protocol", "tool": "risk-assess"}]',
      },
      {
        name: "contract-audit",
        description: "Check smart contract audit status for a protocol",
        keywords: [
          "audit",
          "security",
          "vulnerabilities",
          "contract check",
          "code review",
        ],
        example:
          '"Is Compound audited?" → [{"description": "Check smart contract audit status for Compound", "tool": "contract-audit"}]',
      },
      {
        name: "execute-swap",
        description:
          "Get a live swap quote from Uniswap Trading API (real mainnet prices)",
        keywords: [
          "swap",
          "trade",
          "exchange",
          "buy",
          "sell",
          "convert",
          "quote",
        ],
        example:
          '"Swap 1 ETH for USDC" → [{"description": "Get swap quote for 1 ETH to USDC via Uniswap", "tool": "execute-swap"}]',
      },
      {
        name: "execute-deposit",
        description: "Deposit tokens into a DeFi protocol",
        keywords: [
          "deposit",
          "stake",
          "provide liquidity",
          "add to pool",
          "lock",
        ],
        example:
          '"Deposit 100 USDC into Aave" → [{"description": "Deposit 100 USDC into Aave lending pool", "tool": "execute-deposit"}]',
      },
      {
        name: "check-balance",
        description: "Check wallet ETH or ERC-20 token balance on-chain",
        keywords: [
          "balance",
          "portfolio",
          "holdings",
          "wallet",
          "show my",
          "what do I have",
          "how much",
        ],
        example:
          '"Show my portfolio" → [{"description": "Check wallet balances and holdings", "tool": "check-balance"}]',
      },
      {
        name: "pay-with-any-token",
        description:
          "Auto-swap any token to USDC via Uniswap before x402 payment",
        keywords: ["pay with", "convert to USDC", "auto-swap payment"],
        example:
          '"Pay with ETH" → [{"description": "Auto-swap ETH to USDC for payment", "tool": "pay-with-any-token"}]',
      },
    ],
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

  createServer(agent, PORT);
  console.log(`✅ Orchestrator ready on port ${PORT}`);
}

main().catch((err) => {
  console.error("❌ Orchestrator failed to start:", err);
  process.exit(1);
});
