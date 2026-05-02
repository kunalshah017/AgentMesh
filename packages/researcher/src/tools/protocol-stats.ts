// Protocol Stats Tool - Get protocol TVL, volume, and metrics

interface ProtocolData {
  name: string;
  tvl: string;
  change7d: string;
  chains: string[];
  category: string;
  audited: boolean;
}

/**
 * Get protocol TVL and metrics.
 * Uses DeFiLlama protocols API.
 */
export async function getProtocolStats(protocol: string): Promise<ProtocolData> {
  console.log(`📈 Getting stats for ${protocol}...`);

  try {
    const response = await fetch(
      `https://api.llama.fi/protocol/${protocol.toLowerCase()}`,
    );

    if (!response.ok) throw new Error(`DeFiLlama error: ${response.status}`);

    const data = (await response.json()) as {
      name: string;
      tvl: Array<{ totalLiquidityUSD: number }>;
      chains: string[];
      category: string;
      audits: string;
    };

    const currentTvl = data.tvl[data.tvl.length - 1]?.totalLiquidityUSD ?? 0;
    const weekAgoTvl = data.tvl[data.tvl.length - 8]?.totalLiquidityUSD ?? currentTvl;
    const change = ((currentTvl - weekAgoTvl) / weekAgoTvl) * 100;

    return {
      name: data.name,
      tvl: `$${(currentTvl / 1_000_000_000).toFixed(2)}B`,
      change7d: `${change.toFixed(1)}%`,
      chains: data.chains.slice(0, 5),
      category: data.category,
      audited: data.audits !== "0",
    };
  } catch (error) {
    console.error("DeFiLlama protocol fetch failed:", error);
    throw new Error(`Protocol stats unavailable for ${protocol}: ${error}`);
  }
}
