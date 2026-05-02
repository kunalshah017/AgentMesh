// Gas Optimizer Tool — predicts optimal gas prices from Ethereum network
// This is a DEMO of a 3rd-party tool joining the AgentMesh marketplace

interface GasPrediction {
  speed: "slow" | "standard" | "fast" | "instant";
  gasPrice: string; // in Gwei
  estimatedTime: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

interface GasReport {
  network: string;
  blockNumber: number;
  baseFee: string;
  predictions: GasPrediction[];
  timestamp: number;
  recommendation: string;
}

/**
 * Predict optimal gas prices for Ethereum transactions.
 * Uses real Ethereum RPC to fetch base fee and pending block data.
 */
export async function predictGas(network?: string): Promise<GasReport> {
  const rpcUrl =
    process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";

  console.log(`⛽ Predicting gas prices on ${network ?? "ethereum"}...`);

  // Fetch latest block for base fee
  const blockResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["latest", false],
      id: 1,
    }),
  });

  if (!blockResponse.ok) {
    throw new Error(`RPC error: ${blockResponse.status}`);
  }

  const blockData = (await blockResponse.json()) as {
    result: {
      number: string;
      baseFeePerGas: string;
      gasUsed: string;
      gasLimit: string;
    };
  };

  const block = blockData.result;
  const blockNumber = parseInt(block.number, 16);
  const baseFeeWei = BigInt(block.baseFeePerGas);
  const baseFeeGwei = Number(baseFeeWei) / 1e9;
  const gasUsedRatio =
    parseInt(block.gasUsed, 16) / parseInt(block.gasLimit, 16);

  // Also fetch fee history for percentile-based predictions
  const feeHistoryResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_feeHistory",
      params: ["0x5", "latest", [25, 50, 75, 95]],
      id: 2,
    }),
  });

  let priorityFees = [1, 1.5, 2, 3]; // default Gwei
  if (feeHistoryResponse.ok) {
    const feeData = (await feeHistoryResponse.json()) as {
      result: { reward: string[][] };
    };
    if (feeData.result?.reward?.length > 0) {
      // Average the priority fees across recent blocks
      const lastRewards =
        feeData.result.reward[feeData.result.reward.length - 1];
      priorityFees = lastRewards.map((r) => Number(BigInt(r)) / 1e9);
    }
  }

  // Calculate predictions based on base fee + priority fee
  const predictions: GasPrediction[] = [
    {
      speed: "slow",
      gasPrice: (baseFeeGwei * 0.9 + priorityFees[0]).toFixed(2),
      estimatedTime: "~5 min",
      maxFeePerGas: (baseFeeGwei * 1.5 + priorityFees[0]).toFixed(2),
      maxPriorityFeePerGas: priorityFees[0].toFixed(2),
    },
    {
      speed: "standard",
      gasPrice: (baseFeeGwei + priorityFees[1]).toFixed(2),
      estimatedTime: "~30 sec",
      maxFeePerGas: (baseFeeGwei * 2 + priorityFees[1]).toFixed(2),
      maxPriorityFeePerGas: priorityFees[1].toFixed(2),
    },
    {
      speed: "fast",
      gasPrice: (baseFeeGwei * 1.1 + priorityFees[2]).toFixed(2),
      estimatedTime: "~15 sec",
      maxFeePerGas: (baseFeeGwei * 2.5 + priorityFees[2]).toFixed(2),
      maxPriorityFeePerGas: priorityFees[2].toFixed(2),
    },
    {
      speed: "instant",
      gasPrice: (baseFeeGwei * 1.25 + priorityFees[3]).toFixed(2),
      estimatedTime: "next block",
      maxFeePerGas: (baseFeeGwei * 3 + priorityFees[3]).toFixed(2),
      maxPriorityFeePerGas: priorityFees[3].toFixed(2),
    },
  ];

  // Recommendation based on network congestion
  let recommendation: string;
  if (gasUsedRatio > 0.9) {
    recommendation = "Network congested. Use 'fast' or wait for lower fees.";
  } else if (gasUsedRatio > 0.7) {
    recommendation = "Moderate activity. 'standard' speed is fine.";
  } else {
    recommendation = "Low congestion. 'slow' speed will confirm quickly.";
  }

  console.log(
    `   ✅ Gas prediction: base=${baseFeeGwei.toFixed(2)} Gwei, block=${blockNumber}`,
  );

  return {
    network: network ?? "ethereum",
    blockNumber,
    baseFee: `${baseFeeGwei.toFixed(2)} Gwei`,
    predictions,
    timestamp: Date.now(),
    recommendation,
  };
}
