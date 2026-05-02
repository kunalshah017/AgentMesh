import { createConfig, http } from "wagmi";
import { mainnet, sepolia, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

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

// Base Sepolia USDC contract address
export const BASE_SEPOLIA_USDC =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const config = createConfig({
  chains: [baseSepolia, zgTestnet, sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [zgTestnet.id]: http("https://evmrpc-testnet.0g.ai"),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});
