import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// 0G Chain Testnet
const zgTestnet = {
  id: 16602,
  name: "0G Chain Testnet",
  nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Explorer", url: "https://chainscan-newton.0g.ai" },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: "AgentMesh",
  projectId: "agentmesh-marketplace", // WalletConnect project ID placeholder
  chains: [zgTestnet, sepolia, mainnet],
  transports: {
    [zgTestnet.id]: http("https://evmrpc-testnet.0g.ai"),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});
