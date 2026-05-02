// Check Balance Tool — real on-chain queries via viem

import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";

interface BalanceResult {
  address: string;
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

// Well-known tokens on Ethereum mainnet
const TOKENS: Record<string, { address: Address; decimals: number }> = {
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  stETH: {
    address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    decimals: 18,
  },
  WETH: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
};

/**
 * Check wallet token balances using real on-chain RPC calls.
 * Queries ETH balance + known ERC-20 tokens via viem.
 */
export async function checkBalance(
  address: string,
  token?: string,
): Promise<BalanceResult> {
  console.log(
    `💰 Checking balance for ${address} (token: ${token ?? "all"})...`,
  );

  const rpcUrl =
    process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
  const client = createPublicClient({
    chain: mainnet,
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

  // Query ETH balance
  if (
    !token ||
    token.toUpperCase() === "ETH" ||
    token.toUpperCase() === "ALL"
  ) {
    try {
      const ethBal = await client.getBalance({ address: addr });
      const ethFormatted = formatEther(ethBal);
      const ethNum = parseFloat(ethFormatted);
      const ethUsd = ethNum * ethPrice;
      balances.push({
        token: "ETH",
        balance: ethNum.toFixed(6),
        valueUsd: `$${ethUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      totalUsd += ethUsd;
    } catch (e) {
      console.log(`   ⚠️ ETH balance query failed: ${e}`);
    }
  }

  // Query ERC-20 tokens
  const tokensToCheck =
    token && token.toUpperCase() !== "ETH" && token.toUpperCase() !== "ALL"
      ? { [token.toUpperCase()]: TOKENS[token.toUpperCase()] }
      : TOKENS;

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

      // Rough USD value (stablecoins = 1:1, stETH/WETH ≈ ETH price)
      let usdValue = num;
      if (symbol === "stETH" || symbol === "WETH") usdValue = num * ethPrice;

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
    `   ✅ Balance check complete: ${balances.length} tokens, total $${totalUsd.toFixed(2)}`,
  );

  return {
    address,
    balances,
    totalValueUsd: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}
