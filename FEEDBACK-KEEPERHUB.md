# KeeperHub Integration Feedback

> **Project:** AgentMesh — Decentralized AI Agent Marketplace  
> **Hackathon:** ETHGlobal Open Agents 2026  
> **Integration:** KeeperHub MCP (session-based, `https://app.keeperhub.com/mcp`)

---

## What We Built

AgentMesh uses KeeperHub in two ways:

1. **Executor Agent** — Generates and executes DeFi workflows (deposits, swaps) via `ai_generate_workflow` + `execute_workflow`
2. **Reputation System** — Calls `execute_contract_call` to write reputation scores to our ReputationTracker contract on 0G Chain

### Integration Path

```
Orchestrator → Executor Agent → KeeperHub MCP → DeFi protocols (Lido, Aave, etc.)
Orchestrator → reputation.ts → KeeperHub MCP → 0G Chain (ReputationTracker contract)
```

### Tools Used

| Tool                    | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `ai_generate_workflow`  | AI-generated DeFi workflows from natural language     |
| `execute_workflow`      | Execute a generated workflow                          |
| `list_workflows`        | Enumerate available workflows                         |
| `execute_contract_call` | Direct smart contract writes (reputation on 0G Chain) |

---

## What Worked Well

1. **MCP session protocol** — The `mcp-session-id` header pattern is clean. Initialize once, reuse the session. Our cached session approach worked flawlessly for the entire hackathon.

2. **AI workflow generation** — `ai_generate_workflow` with a natural language prompt like "deposit 5 ETH into Lido" produces working workflow JSON. The AI understands DeFi primitives well.

3. **Tool diversity** — Having both high-level (`ai_generate_workflow`) and low-level (`execute_contract_call`) tools gives flexibility. We used the low-level tool for reputation and the high-level for DeFi.

4. **API key provisioning** — Getting started at app.keeperhub.com was fast, key worked immediately.

5. **Standard JSON-RPC** — Using JSON-RPC 2.0 over HTTP means any MCP client works. No proprietary protocol.

---

## Pain Points & Suggestions

### 1. 0G Chain Support is Undocumented (MEDIUM FRICTION)

**Problem:** We needed to call our ReputationTracker contract on 0G Chain (chainId: 16602). KeeperHub's `execute_contract_call` accepts a `network` parameter, but the supported networks aren't listed anywhere in documentation.

**What we did:**

```typescript
await callKeeperHub(apiKey, "execute_contract_call", {
  network: "16602", // 0G Chain testnet — does this work?
  contractAddress: REPUTATION_TRACKER_ADDRESS,
  functionName: "recordTask",
  functionArgs: JSON.stringify(args),
  abi: JSON.stringify(abi),
});
```

**Result:** The call was accepted but we couldn't verify if KeeperHub actually supports 0G Chain for write operations. We implemented a direct `eth_sendRawTransaction` fallback.

**Suggestion:** Document supported networks with chain IDs, or return a clear error like `"network 16602 not supported"` instead of silently failing. A `GET /supported-networks` endpoint would be ideal.

---

### 2. Workflow Execution Requires Funded Turnkey Wallet (HIGH FRICTION)

**Problem:** `execute_workflow` requires a Turnkey-managed wallet with funds. During a hackathon, getting testnet funds into a Turnkey wallet is a multi-step process that's not well-documented.

**Reproduction:**

```json
{ "error": { "code": -32000, "message": "Insufficient funds for execution" } }
```

**Suggestion:**

- Provide a "dry-run" mode that simulates execution without funds
- Or: support user-provided private keys for signing (like how Uniswap's API works with `swapper` address)
- Or: auto-fund from a testnet faucet on first execution

---

### 3. Session Expiry Without Clear Signal

**Problem:** MCP sessions expire after some time (seems like ~24h?) but there's no explicit expiry header or event. Our code had to detect 401/403 and re-initialize.

**What we implemented:**

```typescript
if (response.status === 401 || response.status === 403) {
  cachedSessionId = null;
  const newSessionId = await initKeeperHubSession(apiKey);
  // retry...
}
```

**Suggestion:** Include a `mcp-session-expires` header in responses, or send a specific error code (`-32001: session_expired`) instead of generic 401. This enables proactive re-auth.

---

### 4. No Streaming for Long-Running Workflows

**Problem:** `execute_workflow` is synchronous — the response comes only when the workflow completes. For multi-step DeFi workflows (approve → swap → deposit), this can take 30+ seconds with no progress visibility.

**Suggestion:** Support SSE streaming for workflow execution progress. Even simple status updates ("step 1/3: approval submitted") would dramatically improve UX. The `Accept: text/event-stream` header is already in the spec.

---

### 5. ABI Encoding Edge Cases

**Problem:** When passing complex types to `execute_contract_call`, the ABI encoding for `bytes32` parameters required manual conversion. The tool doesn't auto-encode string→bytes32.

**What we had to do:**

```typescript
const agentIdBytes32 =
  "0x" + Buffer.from("orchestrator").toString("hex").padEnd(64, "0");
```

**Suggestion:** Accept human-readable inputs and auto-encode based on the ABI type, or at minimum document the expected encoding format for each Solidity type.

---

## Integration Quality Score

| Aspect               | Score | Notes                                                      |
| -------------------- | ----- | ---------------------------------------------------------- |
| API ergonomics       | 9/10  | Clean MCP, great tool design                               |
| Documentation        | 6/10  | Missing network list, session lifecycle                    |
| Reliability          | 8/10  | Solid during hackathon, no random failures                 |
| DX (getting started) | 7/10  | Fast key provisioning, but wallet funding blocks execution |
| Feature completeness | 8/10  | Has what we need, streaming would be nice                  |

---

## Summary

KeeperHub's MCP interface is the most natural way to give AI agents DeFi execution capabilities. The `ai_generate_workflow` tool is genuinely impressive — turning "deposit 5 ETH into Aave" into a working transaction sequence with one API call.

The main improvement areas are: documenting supported chains (critical for multi-chain projects), reducing friction for testnet execution, and adding progress streaming for long workflows.

**Overall rating: 7.5/10** — Strong product, documentation gaps slow adoption.
