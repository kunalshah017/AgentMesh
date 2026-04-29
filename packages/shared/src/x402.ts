// x402 Payment Middleware
// Wraps MCP tool calls with HTTP 402 payment-required flow
// Compatible with the x402 protocol: https://www.x402.org

import type { Request, Response, NextFunction } from "express";
import { X402, TOOL_PRICES } from "./constants.js";

export interface X402Config {
  /** Wallet address that receives payments */
  paymentAddress: string;
  /** Whether to actually enforce payment (false = log only for demo) */
  enforce: boolean;
}

/**
 * Express middleware that gates MCP tool/call requests behind x402 payment.
 *
 * If the request has a valid X-PAYMENT header, it passes through.
 * Otherwise it returns HTTP 402 with x402-compliant headers.
 */
export function x402PaymentGate(config: X402Config) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only gate tools/call requests, not tools/list
    if (req.method !== "POST") {
      next();
      return;
    }

    const body = req.body as { method?: string; params?: { name?: string } };
    if (body.method !== "tools/call") {
      next();
      return;
    }

    const toolName = body.params?.name ?? "";
    const price = TOOL_PRICES[toolName as keyof typeof TOOL_PRICES] ?? "0.01";

    // Check if payment proof is included
    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (paymentHeader) {
      // Payment provided — validate and pass through
      // In production: verify the x402 payment signature with the facilitator
      // For hackathon: accept any non-empty payment header as valid
      console.log(`  💰 Payment received for ${toolName}: ${price} USDC`);

      // Attach payment info to request for downstream logging
      (
        req as Request & { x402Payment?: { amount: string; from: string } }
      ).x402Payment = {
        amount: price,
        from: paymentHeader.slice(0, 42), // first 42 chars as address approximation
      };
      next();
      return;
    }

    // No payment — return 402 Payment Required
    if (!config.enforce) {
      // Demo mode: log but allow through
      console.log(
        `  ⚡ [x402 demo] Would require ${price} USDC for ${toolName}`,
      );
      next();
      return;
    }

    console.log(`  🔒 402 Payment Required: ${price} USDC for ${toolName}`);
    res.status(402);
    res.setHeader("X-Payment-Address", config.paymentAddress);
    res.setHeader("X-Payment-Amount", price);
    res.setHeader("X-Payment-Token", X402.paymentToken);
    res.setHeader("X-Payment-Network", "base-sepolia");
    res.setHeader("X-Payment-Facilitator", X402.facilitatorUrl);
    res.setHeader("X-Payment-Required", "true");
    res.json({
      error: "Payment Required",
      paymentAddress: config.paymentAddress,
      amount: price,
      token: X402.paymentToken,
      facilitator: X402.facilitatorUrl,
    });
  };
}

/**
 * Extract payment info from a 402 response.
 */
export function parsePaymentRequired(headers: Headers): {
  address: string;
  amount: string;
  token: string;
  facilitator: string;
} {
  return {
    address: headers.get("X-Payment-Address") ?? "",
    amount: headers.get("X-Payment-Amount") ?? "0",
    token: headers.get("X-Payment-Token") ?? "USDC",
    facilitator: headers.get("X-Payment-Facilitator") ?? X402.facilitatorUrl,
  };
}

/**
 * Create an x402 payment header (EIP-3009 compatible).
 * In production this signs a USDC transferWithAuthorization.
 * For hackathon: returns a mock payment proof.
 */
export function createPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
): string {
  // Real implementation would use:
  // 1. EIP-3009 transferWithAuthorization on USDC
  // 2. Sign with wallet private key
  // 3. Encode as x402 payment header
  //
  // For demo: construct a deterministic mock proof
  const proof = {
    type: "x402-payment",
    version: "1.0",
    from: fromAddress,
    to: toAddress,
    amount,
    token: "USDC",
    network: "base-sepolia",
    timestamp: Date.now(),
    // In production: signature field with EIP-3009 sig
  };
  return Buffer.from(JSON.stringify(proof)).toString("base64");
}
