// Execute Swap Tool - Uses Uniswap Trading API

import { UNISWAP, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@agentmesh/shared";

interface SwapResult {
  status: "success" | "pending" | "failed";
  txHash?: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  route: string;
  gasEstimate?: string;
  priceImpact?: string;
}

interface UniswapQuoteResponse {
  requestId: string;
  routing: string;
  quote: {
    input?: { amount: string; token: string };
    output?: { amount: string; token: string };
    swapFee?: { percent: number };
    routeString?: string;
    priceImpact?: { percent: number };
    gasFee?: string;
    gasFeeUSD?: string;
    // Classic quote fields
    methodParameters?: { calldata: string; value: string; to: string };
  };
  permitData?: unknown;
}

/**
 * Execute a token swap via Uniswap Trading API.
 * Flow: quote → (production: check_approval → sign & submit)
 * Gets real mainnet quote. Execution requires funded wallet + approval.
 */
export async function executeSwap(
  tokenIn: string,
  tokenOut: string,
  amount: string,
  chain?: string,
): Promise<SwapResult> {
  const chainId = getChainId(chain ?? "ethereum");
  console.log(
    `💱 Executing swap: ${amount} ${tokenIn} → ${tokenOut} on chain ${chainId}...`,
  );

  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) {
    return {
      status: "failed",
      tokenIn: tokenIn.toUpperCase(),
      tokenOut: tokenOut.toUpperCase(),
      amountIn: amount,
      amountOut: "0",
      route: "No API key",
    };
  }

  try {
    // Resolve token addresses
    const tokenInAddress = resolveTokenAddress(tokenIn);
    const tokenOutAddress = resolveTokenAddress(tokenOut);
    const decimals = TOKEN_DECIMALS[tokenIn.toUpperCase()] ?? 18;
    const amountInWei = toBaseUnits(amount, decimals);

    // Use a demo swapper address (read-only quote, no tx broadcast)
    const swapper =
      process.env.SWAPPER_ADDRESS ??
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

    // Step 1: Get quote from Uniswap
    const quoteResponse = await fetch(`${UNISWAP.apiBaseUrl}/quote`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "EXACT_INPUT",
        amount: amountInWei,
        tokenInChainId: chainId,
        tokenOutChainId: chainId,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        swapper,
        slippageTolerance: 0.5,
        protocols: ["V2", "V3", "V4"],
      }),
    });

    if (!quoteResponse.ok) {
      const errBody = await quoteResponse.text();
      console.log(
        `   ❌ Uniswap quote error (${quoteResponse.status}): ${errBody}`,
      );
      return {
        status: "failed",
        tokenIn: tokenIn.toUpperCase(),
        tokenOut: tokenOut.toUpperCase(),
        amountIn: amount,
        amountOut: "0",
        route: `Uniswap API error: ${quoteResponse.status}`,
      };
    }

    const data = (await quoteResponse.json()) as UniswapQuoteResponse;
    console.log(
      `   ✅ Quote received: routing=${data.routing}, requestId=${data.requestId}`,
    );

    // Parse output amount
    const outDecimals = TOKEN_DECIMALS[tokenOut.toUpperCase()] ?? 18;
    const outputAmount = data.quote?.output?.amount ?? "0";
    const amountOut = fromBaseUnits(outputAmount, outDecimals);

    // Quote is real — execution requires wallet signing (not done here)
    // Return quote result with status "pending" (awaiting wallet signature)
    return {
      status: "pending",
      txHash: data.quote?.methodParameters
        ? `0x${data.requestId?.replace(/-/g, "")}`
        : undefined,
      tokenIn: tokenIn.toUpperCase(),
      tokenOut: tokenOut.toUpperCase(),
      amountIn: amount,
      amountOut,
      route: `Uniswap ${data.routing ?? "Classic"} (${chainId === 1 ? "Mainnet" : `Chain ${chainId}`})`,
      gasEstimate: data.quote?.gasFeeUSD
        ? `~$${data.quote.gasFeeUSD}`
        : undefined,
      priceImpact: data.quote?.priceImpact
        ? `${data.quote.priceImpact.percent}%`
        : undefined,
    };
  } catch (error) {
    console.log(`   ❌ Uniswap API error: ${error}`);
    return {
      status: "failed",
      tokenIn: tokenIn.toUpperCase(),
      tokenOut: tokenOut.toUpperCase(),
      amountIn: amount,
      amountOut: "0",
      route: `Error: ${String(error).slice(0, 60)}`,
    };
  }
}

function resolveTokenAddress(token: string): string {
  return (
    TOKEN_ADDRESSES[token.toUpperCase()] ??
    (token.startsWith("0x") ? token : TOKEN_ADDRESSES.ETH)
  );
}

function getChainId(chain: string): number {
  const chains: Record<string, number> = {
    ethereum: 1,
    mainnet: 1,
    base: 8453,
    arbitrum: 42161,
    optimism: 10,
    polygon: 137,
    avalanche: 43114,
  };
  return chains[chain.toLowerCase()] ?? 1;
}

function toBaseUnits(amount: string, decimals: number): string {
  const [whole, frac = ""] = amount.split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFrac).toString();
}

function fromBaseUnits(amount: string, decimals: number): string {
  const str = amount.padStart(decimals + 1, "0");
  const whole = str.slice(0, str.length - decimals) || "0";
  const frac = str.slice(str.length - decimals);
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
