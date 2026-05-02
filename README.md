# AgentMesh

> **A decentralized multi-agent marketplace where AI agents discover, coordinate, and pay each other for specialized tasks — all over an encrypted P2P mesh with no central server.**

Built for **ETHGlobal Open Agents Hackathon 2026**

**Live Dashboard:** https://agentmesh-app.vercel.app

---

## What It Does

AgentMesh is a crypto-native coordination layer for autonomous AI agents. Instead of one monolithic AI, it's a **mesh of specialized agents** that find each other, negotiate prices, and pay per task — like a miniature decentralized economy for AI labor.

**Example flow:**

> "Find me the best ETH yield opportunity under 5% risk"

1. **Orchestrator** (LLM brain on 0G Compute) plans subtasks
2. Routes "research yields" to **Researcher** agent via P2P mesh → real DeFi Llama data
3. Routes "assess risk" to **Risk Analyst** agent → audit scores + risk factors
4. Each agent gets paid via x402 micropayments (USDC)
5. Results, payments, and reputation all tracked on-chain (0G Chain)
6. Conversation stored to 0G Storage for auditability

## Architecture

```
    ┌──────────────────────┐
    │   DASHBOARD           │  Next.js 15 + React 19 (Live mesh viz)
    │   Chat + Network      │  WebSocket real-time events
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │  ORCHESTRATOR          │  Qwen 2.5 7B via 0G Compute
    │  AXL Node :9002        │  Task planning + coordination
    │  IPv6: 200:3925:...    │
    └──┬────────┬────────┬──┘
       │        │        │     ← AXL P2P (Yggdrasil encrypted overlay)
  ┌────▼───┐ ┌──▼───┐ ┌──▼──────────┐
  │RESEARCH │ │ RISK │ │  EXECUTOR   │
  │:9012    │ │:9022 │ │  :9032      │
  │DeFi     │ │Audit │ │  KeeperHub  │
  │Llama    │ │Score │ │  + Uniswap  │
  └────┬────┘ └──┬───┘ └──────┬──────┘
       │         │             │
       └─────────┼─────────────┘
                 │
    ┌────────────▼─────────────┐
    │  ON-CHAIN LAYER           │
    │  ● 0G Chain (registry)    │  AgentRegistry.sol
    │  ● 0G Chain (reputation)  │  ReputationTracker.sol
    │  ● ENS (agent identity)   │  *.agentmesh.eth
    │  ● x402 (micropayments)   │  USDC per tool call
    │  ● 0G Storage (logs)      │  Conversation audit trail
    └──────────────────────────┘
```

## Live Integrations

| Sponsor        | What We Built                                                                                                       | Status                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **0G**         | Compute (Qwen 2.5 7B for task planning), Storage (conversation logs), Chain (agent registry + reputation contracts) | ✅ Live on testnet      |
| **Gensyn AXL** | Full P2P mesh — 4 nodes with encrypted Yggdrasil overlay, MCP routing between nodes                                 | ✅ Verified             |
| **Uniswap**    | Trading API integration — real-time quotes (tested: 1 ETH = 2229 USDC)                                              | ✅ Live mainnet quotes  |
| **KeeperHub**  | MCP server for autonomous workflow creation + onchain execution                                                     | ✅ Live (session-based) |
| **ENS**        | Agent identity: `orchestrator.agentmesh.eth`, `researcher.agentmesh.eth`, etc.                                      | ✅ Configured           |
| **x402**       | HTTP-native micropayments — agents pay each other USDC per tool call                                                | ✅ Integrated           |

## Deployed Contracts (0G Chain Testnet — Chain ID 16602)

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| AgentRegistry     | `0x0B05236c972DbFCe91519a183980F0D5fFd9da28` |
| ReputationTracker | `0x2B8C2D313300122e0Fd90a3B7F4e3f0Bb05E2Cf4` |

## Quick Start

```bash
# Prerequisites: Bun 1.3+, Go 1.25+ (for AXL node), Python 3.12+ with uv

# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Fill in: ZG_API_SECRET, UNISWAP_API_KEY, KEEPERHUB_API_KEY

# 3. Start the P2P mesh (4 AXL nodes + MCP routers)
cd axl-node && ./start-mesh.sh

# 4. Start the orchestrator (in another terminal)
bun run dev:orchestrator

# 5. Start the dashboard
bun run dev:client

# 6. Open http://localhost:3000 and ask:
#    "Find the best ETH staking yields and assess the risk"
```

### Running Without AXL (Local Mode — default)

```bash
# Just the orchestrator + frontend — no P2P required
bun run dev:orchestrator   # Starts on :3001 (LOCAL_MODE=true)
bun run dev:client         # Dashboard on :3000
```

## Project Structure

```
agentmesh/
├── client/                    # Next.js 15 dashboard
│   └── src/
│       ├── components/        # NetworkGraph, ChatPanel, ActivityFeed
│       └── hooks/             # useOrchestrator (WebSocket)
├── packages/
│   ├── shared/                # Types, AXL utils, constants
│   ├── orchestrator/          # LLM brain (0G Compute) + task router
│   ├── researcher/            # DeFi yield scanner (DeFi Llama API)
│   ├── risk-analyst/          # Risk scoring + audit checker
│   ├── executor/              # Uniswap swaps + KeeperHub deposits
│   └── contracts/             # Solidity (AgentRegistry, ReputationTracker)
├── axl-node/                  # AXL P2P node (Go) + Python MCP routers
│   ├── configs/               # 4-node topology configs
│   ├── keys/                  # Ed25519 node identities
│   ├── integrations/          # Python MCP router + A2A server
│   └── start-mesh.sh         # One-command mesh launcher
└── .env                       # API keys (not committed)
```

## How It Works

### 1. Task Planning (0G Compute)

The orchestrator uses Qwen 2.5 7B (running on 0G decentralized compute) to break user goals into subtasks and assign them to specialized agents.

### 2. P2P Discovery & Routing (AXL)

Each agent runs as an AXL node with a unique Ed25519 identity and IPv6 overlay address. The orchestrator routes MCP requests to specific peers by public key — no central server, no DNS, fully encrypted.

### 3. Tool Execution (MCP)

Each agent exposes tools via the Model Context Protocol:

- **Researcher**: `scan-yields`, `token-info`, `protocol-stats` (live DeFi Llama data)
- **Risk Analyst**: `risk-assess`, `contract-audit` (scoring + audit history)
- **Executor**: `execute-swap` (Uniswap Trading API), `execute-deposit` (KeeperHub MCP)

### 4. Payments (x402)

Every tool call includes a micropayment. The orchestrator pays agents in USDC via the x402 protocol — HTTP-native, no transaction delays.

### 5. Reputation (0G Chain)

Successful task completions are recorded on-chain. The `ReputationTracker` contract maintains scores that inform future agent selection.

### 6. Auditability (0G Storage)

Every conversation (goal → subtasks → results) is stored to 0G decentralized storage with a content hash for verifiability.

## Tech Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Runtime    | TypeScript + Bun 1.3                  |
| Frontend   | Next.js 15, React 19, Tailwind CSS v4 |
| P2P Mesh   | Gensyn AXL (Go) + Python MCP routers  |
| LLM        | Qwen 2.5 7B on 0G Compute Network     |
| Storage    | 0G Decentralized Storage              |
| Blockchain | 0G Chain Testnet (Solidity + Hardhat) |
| Payments   | x402 protocol (USDC micropayments)    |
| Identity   | ENS (\*.agentmesh.eth)                |
| DeFi Data  | DeFi Llama API (live yields)          |
| Execution  | Uniswap Trading API + KeeperHub MCP   |

## Key Differentiators

1. **Fully Decentralized** — No central coordinator. Agents find each other via P2P mesh.
2. **Crypto-Native Payments** — Every tool call is a paid transaction. Agents earn for their work.
3. **Real Data** — Not mocked. Live DeFi yields, real Uniswap quotes, actual KeeperHub workflows.
4. **Modular** — Any agent can join the mesh by running an AXL node and registering its MCP tools.
5. **Auditable** — Every decision stored on-chain + decentralized storage.

---

## Verifiable Artifacts

Every claim is backed by on-chain or verifiable evidence:

| Claim                      | Evidence                                                        | Link                                                                                                                    |
| -------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AgentRegistry deployed     | 5 agents registered on 0G Chain                                 | [chainscan.0g.ai](https://chainscan-newton.0g.ai/address/0x0B05236c972DbFCe91519a183980F0D5fFd9da28)                    |
| ReputationTracker deployed | Contract live on 0G Chain                                       | [chainscan.0g.ai](https://chainscan-newton.0g.ai/address/0x2B8C2D313300122e0Fd90a3B7F4e3f0Bb05E2Cf4)                    |
| x402 payment (researcher)  | 0.01 USDC transfer, Base Sepolia block 40986221                 | [tx 0x68eb13b...](https://sepolia.basescan.org/tx/0x68eb13ba381adee4ccce928461f4f4b0116f460f505b4d1c6968a4868e56927c)   |
| x402 payment (executor)    | 0.05 USDC transfer, Base Sepolia block 40986230                 | [tx 0x76d2f90...](https://sepolia.basescan.org/tx/0x76d2f9047e3d96066fb975a0a15e549cdd32352171ab42d0ce089db96d256551)   |
| ENS: agent-mesh.eth        | Registered on Sepolia + 4 subnames with text records            | [tx 0xafb65e3...](https://sepolia.etherscan.io/tx/0xafb65e330d1024e730c0f15fc9146b46740493ee4e3fb5b336bdfd10263b2a47)   |
| ENS subnames               | researcher/executor/analyst/gas-optimizer.agent-mesh.eth         | [sepolia.app.ens.domains](https://sepolia.app.ens.domains/agent-mesh.eth)                                               |
| Reputation tx (researcher) | recordTask confirmed, block 31120216                            | [tx 0xea2ca6c...](https://chainscan-newton.0g.ai/tx/0xea2ca6c50dbdaf1a6e1620fe99224e0762e9d06e0a606f622d3794bf95ba84f3) |
| Reputation tx (executor)   | recordTask confirmed, block 31120275                            | [tx 0x06caf93...](https://chainscan-newton.0g.ai/tx/0x06caf9370f4705b3bff3b70afb76b3941a5760e5167a9cdb19452ea4449730cd) |
| Reputation tx (analyst)    | recordTask confirmed, block 31125183                            | [tx 0xcd21f6d...](https://chainscan-newton.0g.ai/tx/0xcd21f6d0d04e2c4367efa5391b5e0a7d950aade4e47f0661765b94ec6298dbac) |
| Reputation tx (gas-opt)    | recordTask confirmed, block 31125243                            | [tx 0xea6d5e5...](https://chainscan-newton.0g.ai/tx/0xea6d5e57dea6dc055e3a74192fa8e6210fd9eb65226140e60939cf18e972b13e) |
| KeeperHub → 0G Chain       | execute_contract_call accepted (exec ID: pydj7vykkmw60xt4bsfts) | KeeperHub wallet unfunded on 0G; proves network support                                                                 |
| KeeperHub MCP session      | search_plugins + tools/list (30 tools)                          | Real MCP session with `mcp-session-id` header                                                                           |
| 0G Storage KV write        | Real tx submitted via SDK Batcher                               | tx `0xe25088c93e7a36b89d3af259f5811385b24f567701a02ef5a88ca172404199cb`                                                 |
| Uniswap Trading API        | Live mainnet quote (1 ETH = 2304 USDC)                          | Quote via `POST /v1/quote`                                                                                              |
| x402 EIP-712 signatures    | Real `signTypedData` + `verifyTypedData`                        | Verified in integration tests                                                                                           |
| AXL 4-node mesh            | MCP routing between all peers                                   | `GET /api/topology` returns 4 connected nodes                                                                           |
| 0G Compute LLM             | Task planning via qwen-2.5-7b-instruct                          | OpenAI-compatible endpoint                                                                                              |
| pay-with-any-token         | Uniswap EXACT_OUTPUT quotes                                     | 0.000434 ETH → 1.00 USDC                                                                                                |
| Live Frontend              | Marketplace + Dashboard deployed                                | [agentmesh-app.vercel.app](https://agentmesh-app.vercel.app)                                                            |

---

## Known Limitations

We believe in transparency. Here's what's real and what has constraints:

1. **x402 payments are real but simplified** — Real USDC transfers settle on Base Sepolia ([tx 0x68eb13b](https://sepolia.basescan.org/tx/0x68eb13ba381adee4ccce928461f4f4b0116f460f505b4d1c6968a4868e56927c)). Production would use the x402 facilitator for escrow.
2. **Swap execution is quote-only** — Uniswap Trading API returns real mainnet quotes, but we don't broadcast swap transactions (would need funded wallet + approval flow).
3. **0G Storage depends on community node** — We use `http://178.238.236.119:6789` (community KV node). If it goes offline, storage falls back to content-addressed hashes.
4. **KeeperHub workflow execution requires Turnkey wallet funding** — `ai_generate_workflow` works, but `execute_workflow` needs a funded Turnkey wallet we haven't provisioned.
5. **ENS is on Sepolia testnet** — `agent-mesh.eth` registered with 4 agent subnames + text records. Production would use mainnet ENS.
6. **Single-machine mesh** — All 4 AXL nodes run on localhost. Production would use separate machines/IPs.
7. **No rate limiting** — Tool providers don't rate-limit requests (fine for demo, not for production).
8. **Reputation writes cost gas** — Each `recordTask` call costs ~117K gas on 0G Chain. Production would batch updates.

---

## Builder Feedback

We filed detailed integration feedback for sponsors:

- [FEEDBACK-UNISWAP.md](./FEEDBACK-UNISWAP.md) — Uniswap Trading API
- [FEEDBACK-GENSYN.md](./FEEDBACK-GENSYN.md) — Gensyn AXL P2P
- [FEEDBACK-KEEPERHUB.md](./FEEDBACK-KEEPERHUB.md) — KeeperHub MCP

---

## How to Publish Your Own Tool

AgentMesh is an **open marketplace** — anyone can deploy a tool and start earning. Here's how:

### 1. Build an MCP Service

Create a lightweight service that exposes tool capabilities via MCP protocol:

```typescript
// my-tool/src/index.ts
export async function myTool(input: string): Promise<{ result: string }> {
  // Your logic here — no LLM needed, just input → output
  return { result: "..." };
}
```

### 2. Register On-Chain

Register your tool on the AgentRegistry (0G Chain testnet):

```bash
bun run packages/contracts/scripts/register-tool.ts -- \
  --name "my-tool.agentmesh.eth" \
  --key "<your-ed25519-axl-key>" \
  --capabilities "my-capability,another-skill" \
  --price "0.01"
```

### 3. Get Discovered & Earn

Once registered, the Orchestrator automatically discovers your tool when a user task matches your capabilities. You earn USDC per call via x402 payments.

```
User task → Orchestrator queries registry → Finds YOUR tool → Calls it → Pays you
```

No GPU required. No approval process. Deploy, register, earn.

---

## Team

Built by [@kunalshah017](https://github.com/kunalshah017)

## License

MIT
