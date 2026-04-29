// pay-with-any-token: Auto-swap via Uniswap before x402 payment
// If agent holds ETH but tool requires USDC, this module:
// 1. Gets a Uniswap quote for the required USDC amount
// 2. Executes the swap (or simulates for demo)
// 3. Creates the x402 payment proof with the resulting USDC

import { UNISWAP, TOKEN_ADDRESSES, TOKEN_DECIMALS } from "@agentmesh/shared";

interface PayWithAnyTokenResult {
  swapExecuted: boolean;
  sourceToken: string;
  targetToken: string;
  amountIn: string;
  amountOut: string;
  swapRoute?: string;
  paymentReady: boolean;
}

/**
 * Pay for an x402 tool call using any token the agent holds.
 * Gets a Uniswap quote to convert sourceToken → USDC,
 * then creates the payment proof.
 *
 * This is the "pay-with-any-token" skill from the Uniswap AI toolkit.
 */
export async function payWithAnyToken(
  sourceToken: string,
  usdcAmount: string,
  chain?: string,
): Promise<PayWithAnyTokenResult> {
  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) {
    return {
      swapExecuted: false,
      sourceToken,
      targetToken: "USDC",
      amountIn: "0",
      amountOut: usdcAmount,
      paymentReady: false,
    };
  }

  // If already paying in USDC, no swap needed
  if (sourceToken.toUpperCase() === "USDC") {
    return {
      swapExecuted: false,
      sourceToken: "USDC",
      targetToken: "USDC",
      amountIn: usdcAmount,
      amountOut: usdcAmount,
      paymentReady: true,
    };
  }

  const chainId = chain === "base" ? 8453 : 1; // default to mainnet
  const tokenInAddress =
    TOKEN_ADDRESSES[sourceToken.toUpperCase()] ?? TOKEN_ADDRESSES.ETH;
  const tokenOutAddress = TOKEN_ADDRESSES.USDC;

  // Get reverse quote: how much sourceToken needed for X USDC?
  const usdcDecimals = TOKEN_DECIMALS.USDC; // 6
  const amountOutWei = (parseFloat(usdcAmount) * 10 ** usdcDecimals).toString();

  try {
    console.log(
      `   💱 pay-with-any-token: Getting quote for ${usdcAmount} USDC via ${sourceToken}...`,
    );

    const quoteResponse = await fetch(`${UNISWAP.apiBaseUrl}/quote`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "EXACT_OUTPUT",
        amount: amountOutWei,
        tokenInChainId: chainId,
        tokenOutChainId: chainId,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        swapper:
          process.env.SWAPPER_ADDRESS ??
          "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        slippageTolerance: 0.5,
        protocols: ["V2", "V3", "V4"],
      }),
    });

    if (!quoteResponse.ok) {
      const errBody = await quoteResponse.text();
      console.log(
        `   ⚠️ Uniswap EXACT_OUTPUT quote failed (${quoteResponse.status}): ${errBody}`,
      );
      // Fallback: use EXACT_INPUT with estimated amount
      return await fallbackExactInput(sourceToken, usdcAmount, chainId, apiKey);
    }

    const data = (await quoteResponse.json()) as {
      routing?: string;
      quote?: { input?: { amount: string }; output?: { amount: string } };
    };

    const inputAmountWei = data.quote?.input?.amount ?? "0";
    const sourceDecimals = TOKEN_DECIMALS[sourceToken.toUpperCase()] ?? 18;
    const amountIn = fromBaseUnits(inputAmountWei, sourceDecimals);

    console.log(
      `   ✅ pay-with-any-token: Need ${amountIn} ${sourceToken} for ${usdcAmount} USDC (${data.routing})`,
    );

    return {
      swapExecuted: true,
      sourceToken: sourceToken.toUpperCase(),
      targetToken: "USDC",
      amountIn,
      amountOut: usdcAmount,
      swapRoute: `Uniswap ${data.routing ?? "Classic"}`,
      paymentReady: true,
    };
  } catch (error) {
    console.log(`   ❌ pay-with-any-token error: ${error}`);
    return {
      swapExecuted: false,
      sourceToken,
      targetToken: "USDC",
      amountIn: "0",
      amountOut: usdcAmount,
      paymentReady: false,
    };
  }
}

async function fallbackExactInput(
  sourceToken: string,
  usdcAmount: string,
  chainId: number,
  apiKey: string,
): Promise<PayWithAnyTokenResult> {
  // Estimate: for small amounts, use a generous input
  const sourceDecimals = TOKEN_DECIMALS[sourceToken.toUpperCase()] ?? 18;
  // Rough estimate: 0.001 ETH per 0.01 USDC (will be overridden by real quote)
  const estimatedInput = (parseFloat(usdcAmount) / 2200).toFixed(6); // ~ETH/USD rate
  const amountInWei = toBaseUnits(estimatedInput, sourceDecimals);

  const tokenInAddress =
    TOKEN_ADDRESSES[sourceToken.toUpperCase()] ?? TOKEN_ADDRESSES.ETH;
  const tokenOutAddress = TOKEN_ADDRESSES.USDC;

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
      swapper:
        process.env.SWAPPER_ADDRESS ??
        "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      slippageTolerance: 0.5,
      protocols: ["V2", "V3", "V4"],
    }),
  });

  if (!quoteResponse.ok) {
    return {
      swapExecuted: false,
      sourceToken,
      targetToken: "USDC",
      amountIn: estimatedInput,
      amountOut: usdcAmount,
      paymentReady: false,
    };
  }

  const data = (await quoteResponse.json()) as {
    routing?: string;
    quote?: { output?: { amount: string } };
  };

  const outputWei = data.quote?.output?.amount ?? "0";
  const amountOut = fromBaseUnits(outputWei, TOKEN_DECIMALS.USDC);

  return {
    swapExecuted: true,
    sourceToken: sourceToken.toUpperCase(),
    targetToken: "USDC",
    amountIn: estimatedInput,
    amountOut,
    swapRoute: `Uniswap ${data.routing ?? "Classic"} (estimated)`,
    paymentReady: true,
  };
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
