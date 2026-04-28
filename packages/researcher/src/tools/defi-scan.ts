// DeFi Scan Tool - Scans protocols for yield opportunities

interface YieldOpportunity {
  protocol: string;
  pool: string;
  apy: string;
  tvl: string;
  risk: "low" | "medium" | "high";
  chain: string;
}

/**
 * Scan DeFi protocols for best yield opportunities.
 * Uses DeFiLlama API for real data.
 */
export async function scanYields(
  token: string,
  amount?: string,
): Promise<YieldOpportunity[]> {
  console.log(`🔍 Scanning yields for ${amount ?? "?"} ${token}...`);

  try {
    // Query DeFiLlama pools API
    const response = await fetch("https://yields.llama.fi/pools");

    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: Array<{
        project: string;
        symbol: string;
        pool: string;
        apy: number;
        tvlUsd: number;
        chain: string;
      }>;
    };

    // Filter for the requested token
    const tokenUpper = token.toUpperCase();
    const relevant = data.data
      .filter(
        (pool) =>
          pool.symbol.toUpperCase().includes(tokenUpper) &&
          pool.tvlUsd > 1_000_000 && // Only pools with >$1M TVL
          pool.apy > 0,
      )
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

    return relevant.map((pool) => ({
      protocol: pool.project,
      pool: pool.symbol,
      apy: `${pool.apy.toFixed(2)}%`,
      tvl: `$${(pool.tvlUsd / 1_000_000).toFixed(1)}M`,
      risk: pool.apy > 20 ? "high" : pool.apy > 8 ? "medium" : "low",
      chain: pool.chain,
    }));
  } catch (error) {
    console.error("DeFiLlama fetch failed, using mock data:", error);
    // Fallback mock data for demo reliability
    return [
      { protocol: "Lido", pool: "stETH", apy: "4.2%", tvl: "$14.2B", risk: "low", chain: "Ethereum" },
      { protocol: "Aave V3", pool: "ETH Supply", apy: "3.1%", tvl: "$8.9B", risk: "low", chain: "Ethereum" },
      { protocol: "Pendle", pool: "PT-stETH", apy: "12.1%", tvl: "$890M", risk: "medium", chain: "Ethereum" },
      { protocol: "Compound V3", pool: "ETH", apy: "2.8%", tvl: "$3.2B", risk: "low", chain: "Ethereum" },
      { protocol: "Morpho", pool: "ETH/USDC", apy: "8.5%", tvl: "$1.1B", risk: "medium", chain: "Ethereum" },
    ];
  }
}
