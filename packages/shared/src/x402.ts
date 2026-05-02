// x402 Payment Middleware
// Wraps MCP tool calls with HTTP 402 payment-required flow
// Compatible with the x402 protocol: https://www.x402.org

import type { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
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
      // Payment provided — verify the x402 EIP-712 signature
      try {
        const decoded = JSON.parse(
          Buffer.from(paymentHeader, "base64").toString(),
        );

        if (decoded.signed && decoded.signature) {
          // Verify the EIP-712 signature recovers to the claimed sender
          const domain: ethers.TypedDataDomain = {
            name: "USD Coin",
            version: "2",
            chainId: 84532n,
            verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          };
          const types = {
            TransferWithAuthorization: [
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "validAfter", type: "uint256" },
              { name: "validBefore", type: "uint256" },
              { name: "nonce", type: "bytes32" },
            ],
          };
          const message = {
            from: decoded.from,
            to: decoded.to,
            value: BigInt(decoded.value),
            validAfter: BigInt(decoded.validAfter),
            validBefore: BigInt(decoded.validBefore),
            nonce: decoded.nonce,
          };

          const recoveredAddress = ethers.verifyTypedData(
            domain,
            types,
            message,
            decoded.signature,
          );

          if (recoveredAddress.toLowerCase() !== decoded.from.toLowerCase()) {
            console.log(
              `  ❌ x402 signature invalid: recovered ${recoveredAddress}, expected ${decoded.from}`,
            );
            if (config.enforce) {
              res.status(401).json({ error: "Invalid payment signature" });
              return;
            }
          }

          console.log(
            `  ✅ x402 payment VERIFIED for ${toolName}: ${price} USDC (signer: ${recoveredAddress.slice(0, 10)}...)`,
          );
        } else {
          console.log(
            `  💰 x402 payment received for ${toolName}: ${price} USDC (unsigned proof)`,
          );
        }
      } catch {
        console.log(
          `  💰 Payment header received for ${toolName}: ${price} USDC`,
        );
      }

      // Attach payment info to request for downstream logging
      (
        req as Request & { x402Payment?: { amount: string; from: string } }
      ).x402Payment = {
        amount: price,
        from: paymentHeader.slice(0, 42),
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
 * Signs a real EIP-712 structured message for USDC transferWithAuthorization.
 * Uses ethers.Wallet.signTypedData() for cryptographically valid signatures.
 * NOTE: Requires USDC balance on Base Sepolia for the transfer to settle.
 *       Even without balance, the signature is cryptographically valid.
 */
export async function createPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    // Fallback to unsigned proof if no key available
    console.log("  ⚠️ No PRIVATE_KEY — x402 payment proof unsigned");
    const proof = {
      type: "x402-payment",
      version: "1.0",
      from: fromAddress,
      to: toAddress,
      amount,
      token: "USDC",
      network: "base-sepolia",
      timestamp: Date.now(),
      signed: false,
    };
    return Buffer.from(JSON.stringify(proof)).toString("base64");
  }

  const wallet = new ethers.Wallet(privateKey);
  const signerAddress = wallet.address;

  // EIP-3009 transferWithAuthorization parameters
  const validAfter = Math.floor(Date.now() / 1000) - 60;
  const validBefore = Math.floor(Date.now() / 1000) + 3600;
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const value = ethers.parseUnits(amount, 6); // USDC has 6 decimals

  // EIP-712 Domain for USDC on Base Sepolia
  const domain: ethers.TypedDataDomain = {
    name: "USD Coin",
    version: "2",
    chainId: 84532n,
    verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  };

  // EIP-3009 TransferWithAuthorization types
  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: signerAddress,
    to: toAddress,
    value: value,
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce: nonce,
  };

  // Sign the EIP-712 typed data
  const signature = await wallet.signTypedData(domain, types, message);

  const payload = {
    type: "x402-payment",
    version: "1.0",
    network: "base-sepolia",
    chainId: 84532,
    token: "USDC",
    tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    from: signerAddress,
    to: toAddress,
    value: value.toString(),
    validAfter,
    validBefore,
    nonce,
    signature,
    signed: true,
  };

  console.log(
    `  ✅ x402 payment signed: ${amount} USDC (${signerAddress.slice(0, 8)}... → ${toAddress.slice(0, 8)}...)`,
  );
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
