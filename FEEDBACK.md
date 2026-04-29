# Uniswap Integration Feedback

> **Project:** AgentMesh — Decentralized AI Agent Marketplace
> **Hackathon:** ETHGlobal Open Agents 2026
> **Integration:** Uniswap Trading API (`https://trade-api.gateway.uniswap.org/v1`)

---

## What We Built

Our **Executor agent** uses the Uniswap Trading API to provide real-time token swap capabilities to autonomous AI agents. When the orchestrator determines a swap is needed (e.g., "swap 10 ETH to USDC"), it delegates to the executor which calls the Trading API for live quotes and execution.

### Integration Path

```
User goal → Orchestrator (0G Compute LLM) → Executor Agent → Uniswap Trading API
```

### Endpoints Used

| Endpoint                  | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `POST /v1/quote`          | Get real-time swap quotes (EXACT_INPUT routing) |
| `POST /v1/check_approval` | Verify token approvals before swap              |

### What Worked Well

1. **OpenAI-compatible API design** — The REST API is clean, well-documented, and easy to integrate. Getting a quote is a single POST request.

2. **Real-time mainnet quotes** — We tested live and got accurate quotes (1 ETH = 2229.51 USDC at time of testing). This made our demo much more impressive than mocked data.

3. **Flexible routing** — The `CLASSIC` routing type with `ALL_PROTOCOLS` gave us v2/v3/v4 pool access without complexity.

4. **API key provisioning** — Getting a key from developers.uniswap.org/dashboard was instant and frictionless.

5. **Chain flexibility** — Supporting multiple chains (1, 8453, 42161, 137) with the same API meant we could show cross-chain capability without separate integrations.

---

## Pain Points & Suggestions

### 1. Quote Response Structure

The `quote` response nests pricing data inconsistently. The `priceImpact` field was sometimes undefined or nested differently than the docs suggest. A consistent, flat response shape would reduce integration friction.

**Suggestion:** Standardize the response envelope. Always return `{ quote: { amountOut, priceImpact, gasEstimate, route } }` at the top level regardless of routing type.

### 2. UniswapX Minimums Are High for Agent Micropayments

UniswapX requires 300 USDC minimum on mainnet, 1000 USDC on L2. For AI agent micropayments (typically $0.01–$5 per task), this makes UniswapX unusable. We had to force `CLASSIC` routing.

**Suggestion:** Lower UniswapX minimums for programmatic/agent use cases, or provide an `agent` routing preference that auto-selects the best option for small amounts.

### 3. No Testnet/Sandbox Mode

For a hackathon, we couldn't safely test actual swap execution without risking real funds. We used live quotes but had to mock the final `POST /swap` + transaction submission step.

**Suggestion:** A Sepolia/Base Sepolia endpoint with test tokens would let developers iterate on the full swap lifecycle safely. Even a "dry-run" mode that validates everything but doesn't broadcast would help.

### 4. Missing WebSocket/Streaming for Price Updates

Our dashboard shows real-time agent activity. Getting fresh quotes requires polling. For AI agents that need to monitor prices and act on thresholds, a WebSocket price feed would be valuable.

**Suggestion:** Add a `GET /v1/stream?pairs=ETH-USDC,WBTC-ETH` SSE/WebSocket endpoint for real-time price updates.

### 5. Error Messages Could Be More Descriptive

When a quote fails (e.g., insufficient liquidity, unsupported pair), the error response is sometimes just `{ "error": "QUOTE_ERROR" }` without details on what went wrong or how to fix it.

**Suggestion:** Include `errorCode`, `detail`, and `suggestion` fields in error responses.

---

## What Would Make the Uniswap API Great for AI Agents

1. **Batch quotes** — AI agents often compare multiple swap routes. A single `POST /v1/quotes` endpoint accepting an array of pairs would reduce latency.

2. **Quote validity TTL** — Include a `validUntil` timestamp in quote responses so agents know when to re-fetch.

3. **Gas estimation in USD** — Agents making cost decisions need gas in USD terms, not just wei. The API could return `gasEstimateUSD` alongside `gasEstimate`.

4. **MCP tool wrapper** — Since this hackathon is about AI agents and MCP, providing an official Uniswap MCP server (like KeeperHub does) would make integration trivial for any MCP-compatible agent.

---

## Integration Code Reference

Our implementation: [`packages/executor/src/tools/execute-swap.ts`](packages/executor/src/tools/execute-swap.ts)

Key snippet:

```typescript
const response = await fetch("https://trade-api.gateway.uniswap.org/v1/quote", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.UNISWAP_API_KEY,
  },
  body: JSON.stringify({
    type: "EXACT_INPUT",
    tokenInChainId: 1,
    tokenOutChainId: 1,
    tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    tokenOut: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    amount: "1000000000000000000", // 1 ETH in wei
    swapper: walletAddress,
    slippageTolerance: 0.5,
    configs: [{ routingType: "CLASSIC", protocols: ["V2", "V3", "V4"] }],
  }),
});
```

---

## Summary

The Uniswap Trading API is solid for production swaps. For the emerging AI agent ecosystem, adding testnet support, batch operations, and an MCP wrapper would make Uniswap the default swap layer for autonomous agents — which is clearly where the industry is heading.

**Overall rating: 8/10** — Great API, just needs agent-specific ergonomics.
