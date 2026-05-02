// Token Info Tool - Get token price and market data

interface TokenData {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  marketCap: string;
  volume24h: string;
}

/**
 * Get token price and market data.
 * Uses CoinGecko or DeFiLlama for real data.
 */
export async function getTokenInfo(token: string): Promise<TokenData> {
  console.log(`📊 Getting info for ${token}...`);

  // Map common symbols to CoinGecko IDs
  const tokenMap: Record<string, string> = {
    ETH: "ethereum",
    BTC: "bitcoin",
    USDC: "usd-coin",
    USDT: "tether",
    DAI: "dai",
    WETH: "weth",
    STETH: "staked-ether",
  };

  const coinId = tokenMap[token.toUpperCase()] ?? token.toLowerCase();

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
    );

    if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`);

    const data = (await response.json()) as Record<
      string,
      { usd: number; usd_24h_change: number; usd_market_cap: number; usd_24h_vol: number }
    >;

    const info = data[coinId];
    if (!info) throw new Error(`Token not found: ${token}`);

    return {
      symbol: token.toUpperCase(),
      name: coinId,
      price: `$${info.usd.toLocaleString()}`,
      change24h: `${info.usd_24h_change.toFixed(2)}%`,
      marketCap: `$${(info.usd_market_cap / 1_000_000_000).toFixed(1)}B`,
      volume24h: `$${(info.usd_24h_vol / 1_000_000_000).toFixed(1)}B`,
    };
  } catch (error) {
    console.error("CoinGecko fetch failed:", error);
    throw new Error(`Token info unavailable for ${token}: ${error}`);
  }
}
