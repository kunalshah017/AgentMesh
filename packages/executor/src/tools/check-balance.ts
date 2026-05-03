// Check Balance Tool — real on-chain queries via viem (multi-chain)

import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  type Address,
  type Chain,
} from "viem";
import {
  mainnet,
  base,
  baseSepolia,
  arbitrum,
  optimism,
  polygon,
  avalanche,
  sepolia,
} from "viem/chains";

interface BalanceResult {
  address: string;
  chain: string;
  balances: Array<{
    token: string;
    balance: string;
    valueUsd: string;
  }>;
  totalValueUsd: string;
}

// ERC-20 balanceOf ABI fragment
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Chain registry with default public RPCs
const CHAINS: Record<
  string,
  { chain: Chain; rpcEnvVar: string; fallbackRpc: string }
> = {
  ethereum: {
    chain: mainnet,
    rpcEnvVar: "ETH_RPC_URL",
    fallbackRpc: "https://ethereum-rpc.publicnode.com",
  },
  mainnet: {
    chain: mainnet,
    rpcEnvVar: "ETH_RPC_URL",
    fallbackRpc: "https://ethereum-rpc.publicnode.com",
  },
  base: {
    chain: base,
    rpcEnvVar: "BASE_RPC_URL",
    fallbackRpc: "https://base-rpc.publicnode.com",
  },
  "base-sepolia": {
    chain: baseSepolia,
    rpcEnvVar: "BASE_SEPOLIA_RPC_URL",
    fallbackRpc: "https://sepolia.base.org",
  },
  sepolia: {
    chain: sepolia,
    rpcEnvVar: "SEPOLIA_RPC_URL",
    fallbackRpc: "https://ethereum-sepolia-rpc.publicnode.com",
  },
  arbitrum: {
    chain: arbitrum,
    rpcEnvVar: "ARBITRUM_RPC_URL",
    fallbackRpc: "https://arbitrum-one-rpc.publicnode.com",
  },
  optimism: {
    chain: optimism,
    rpcEnvVar: "OPTIMISM_RPC_URL",
    fallbackRpc: "https://optimism-rpc.publicnode.com",
  },
  polygon: {
    chain: polygon,
    rpcEnvVar: "POLYGON_RPC_URL",
    fallbackRpc: "https://polygon-bor-rpc.publicnode.com",
  },
  avalanche: {
    chain: avalanche,
    rpcEnvVar: "AVALANCHE_RPC_URL",
    fallbackRpc: "https://avalanche-c-chain-rpc.publicnode.com",
  },
};

// Well-known tokens per chain
const CHAIN_TOKENS: Record<
  string,
  Record<string, { address: Address; decimals: number }>
> = {
  ethereum: {
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
    },
    USDT: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
    DAI: {
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      decimals: 18,
    },
    WETH: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
    },
    stETH: {
      address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      decimals: 18,
    },
    WBTC: {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 8,
    },
    UNI: {
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      decimals: 18,
    },
  },
  base: {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
    USDbC: {
      address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
      decimals: 6,
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    DAI: {
      address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      decimals: 18,
    },
    cbETH: {
      address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
      decimals: 18,
    },
  },
  "base-sepolia": {
    USDC: {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      decimals: 6,
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
  },
  sepolia: {
    USDC: {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
    },
    WETH: {
      address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      decimals: 18,
    },
    DAI: {
      address: "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
      decimals: 18,
    },
    UNI: {
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      decimals: 18,
    },
  },
  arbitrum: {
    USDC: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
    },
    "USDC.e": {
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      decimals: 6,
    },
    USDT: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
    },
    WETH: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      decimals: 18,
    },
    ARB: {
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      decimals: 18,
    },
    DAI: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      decimals: 18,
    },
    WBTC: {
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      decimals: 8,
    },
  },
  optimism: {
    USDC: {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      decimals: 6,
    },
    "USDC.e": {
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      decimals: 6,
    },
    USDT: {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      decimals: 6,
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    OP: { address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    DAI: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      decimals: 18,
    },
  },
  polygon: {
    USDC: {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
    },
    "USDC.e": {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      decimals: 6,
    },
    USDT: {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
    },
    WETH: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      decimals: 18,
    },
    WMATIC: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      decimals: 18,
    },
    DAI: {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18,
    },
    WBTC: {
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      decimals: 8,
    },
  },
  avalanche: {
    USDC: {
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
    },
    "USDC.e": {
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      decimals: 6,
    },
    USDT: {
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      decimals: 6,
    },
    "WETH.e": {
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
    },
    WAVAX: {
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      decimals: 18,
    },
    DAI: {
      address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
      decimals: 18,
    },
    WBTC: {
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      decimals: 8,
    },
  },
};

// Alias chain names
const CHAIN_ALIASES: Record<string, string> = {
  mainnet: "ethereum",
  eth: "ethereum",
  "base sepolia": "base-sepolia",
  "base-testnet": "base-sepolia",
  arb: "arbitrum",
  op: "optimism",
  matic: "polygon",
  poly: "polygon",
  avax: "avalanche",
};

function resolveChainKey(chain?: string): string {
  if (!chain) return "ethereum";
  const normalized = chain.toLowerCase().trim();
  return CHAIN_ALIASES[normalized] ?? normalized;
}

/**
 * Check wallet token balances using real on-chain RPC calls.
 * Supports: Ethereum, Base, Base Sepolia, Sepolia, Arbitrum, Optimism, Polygon, Avalanche.
 */
export async function checkBalance(
  address: string,
  token?: string,
  chain?: string,
): Promise<BalanceResult> {
  const chainKey = resolveChainKey(chain);
  const chainConfig = CHAINS[chainKey];

  if (!chainConfig) {
    return {
      address,
      chain: chain ?? "unknown",
      balances: [],
      totalValueUsd: "$0.00",
    };
  }

  console.log(
    `💰 Checking balance for ${address} on ${chainConfig.chain.name} (token: ${token ?? "all"})...`,
  );

  const rpcUrl = process.env[chainConfig.rpcEnvVar] ?? chainConfig.fallbackRpc;
  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  });

  const addr = address as Address;
  const balances: BalanceResult["balances"] = [];
  let totalUsd = 0;

  // Get ETH price from CoinGecko (simple endpoint, no key needed)
  let ethPrice = 3200; // fallback
  try {
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    );
    if (priceRes.ok) {
      const priceData = (await priceRes.json()) as {
        ethereum?: { usd?: number };
      };
      ethPrice = priceData.ethereum?.usd ?? ethPrice;
    }
  } catch {
    /* use fallback */
  }

  // Native token name varies by chain
  const nativeToken =
    chainKey === "polygon"
      ? "MATIC"
      : chainKey === "avalanche"
        ? "AVAX"
        : "ETH";

  // Query native balance
  if (
    !token ||
    token.toUpperCase() === nativeToken ||
    token.toUpperCase() === "ETH" ||
    token.toUpperCase() === "ALL"
  ) {
    try {
      const nativeBal = await client.getBalance({ address: addr });
      const nativeFormatted = formatEther(nativeBal);
      const nativeNum = parseFloat(nativeFormatted);

      // USD price for native tokens
      let nativePrice = ethPrice;
      if (chainKey === "polygon") {
        try {
          const r = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd",
          );
          if (r.ok) {
            const d = (await r.json()) as {
              "matic-network"?: { usd?: number };
            };
            nativePrice = d["matic-network"]?.usd ?? 0.7;
          }
        } catch {
          nativePrice = 0.7;
        }
      } else if (chainKey === "avalanche") {
        try {
          const r = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd",
          );
          if (r.ok) {
            const d = (await r.json()) as { "avalanche-2"?: { usd?: number } };
            nativePrice = d["avalanche-2"]?.usd ?? 35;
          }
        } catch {
          nativePrice = 35;
        }
      }

      const nativeUsd = nativeNum * nativePrice;
      balances.push({
        token: nativeToken,
        balance: nativeNum.toFixed(6),
        valueUsd: `$${nativeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      totalUsd += nativeUsd;
    } catch (e) {
      console.log(`   ⚠️ ${nativeToken} balance query failed: ${e}`);
    }
  }

  // Query ERC-20 tokens
  const chainTokens = CHAIN_TOKENS[chainKey] ?? CHAIN_TOKENS.ethereum ?? {};
  const tokensToCheck =
    token &&
    token.toUpperCase() !== nativeToken &&
    token.toUpperCase() !== "ETH" &&
    token.toUpperCase() !== "ALL"
      ? { [token.toUpperCase()]: chainTokens[token.toUpperCase()] }
      : chainTokens;

  for (const [symbol, info] of Object.entries(tokensToCheck)) {
    if (!info) continue;
    try {
      const bal = await client.readContract({
        address: info.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [addr],
      });
      const formatted = formatUnits(bal, info.decimals);
      const num = parseFloat(formatted);
      if (num === 0) continue; // Skip zero balances

      // USD value estimation
      let usdValue = num;
      if (
        symbol === "stETH" ||
        symbol === "WETH" ||
        symbol === "WETH.e" ||
        symbol === "cbETH"
      ) {
        usdValue = num * ethPrice;
      } else if (symbol === "WMATIC") {
        usdValue = num * 0.7;
      } else if (symbol === "WAVAX") {
        usdValue = num * 35;
      } else if (symbol === "WBTC") {
        usdValue = num * 67000;
      } else if (symbol === "ARB" || symbol === "OP" || symbol === "UNI") {
        usdValue = num * 8; // rough estimate
      }
      // Stablecoins (USDC, USDT, DAI, USDbC) default to 1:1

      balances.push({
        token: symbol,
        balance: num.toFixed(info.decimals <= 6 ? 2 : 6),
        valueUsd: `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      totalUsd += usdValue;
    } catch (e) {
      console.log(`   ⚠️ ${symbol} balance query failed: ${e}`);
    }
  }

  console.log(
    `   ✅ Balance check on ${chainConfig.chain.name}: ${balances.length} tokens, total $${totalUsd.toFixed(2)}`,
  );

  return {
    address,
    chain: chainConfig.chain.name,
    balances,
    totalValueUsd: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}
