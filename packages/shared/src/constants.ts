// AgentMesh Constants

export const AXL_PORTS = {
  orchestrator: 9002,
  researcher: 9012,
  riskAnalyst: 9022,
  executor: 9032,
} as const;

export const ENS_NAMES = {
  root: "agentmesh.eth",
  orchestrator: "orchestrator.agentmesh.eth",
  researcher: "researcher.agentmesh.eth",
  riskAnalyst: "analyst.agentmesh.eth",
  executor: "executor.agentmesh.eth",
} as const;

export const ZERO_G = {
  computeModel: "qwen/qwen-2.5-7b-instruct",
  chainRpc: "https://evmrpc-testnet.0g.ai",
  storageIndexer: "https://indexer-storage-testnet-turbo.0g.ai",
} as const;

export const X402 = {
  facilitatorUrl: "https://facilitator.x402.org",
  paymentToken: "USDC",
} as const;

export const KEEPERHUB = {
  mcpEndpoint: "https://app.keeperhub.com/mcp",
} as const;

export const UNISWAP = {
  apiBaseUrl: "https://trading-api.gateway.uniswap.org/v1",
} as const;

export const TOOL_PRICES = {
  "defi-scan": "0.02",
  "token-info": "0.01",
  "protocol-stats": "0.01",
  "risk-assess": "0.03",
  "contract-audit": "0.05",
  "portfolio-risk": "0.03",
  "execute-swap": "0.05",
  "execute-deposit": "0.05",
  "check-balance": "0.01",
} as const;
