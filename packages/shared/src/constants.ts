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
  apiBaseUrl: "https://trade-api.gateway.uniswap.org/v1",
} as const;

/** Well-known token addresses on Ethereum Mainnet (chainId 1) */
export const TOKEN_ADDRESSES: Record<string, string> = {
  ETH: "0x0000000000000000000000000000000000000000",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
} as const;

/** Token decimals for wei conversion */
export const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WBTC: 8,
  stETH: 18,
  UNI: 18,
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
