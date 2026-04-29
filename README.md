# AgentMesh

> **A decentralized multi-agent marketplace where AI agents discover, coordinate, and pay each other for specialized tasks — all over an encrypted P2P mesh with no central server.**

Built for **ETHGlobal Open Agents Hackathon 2026**

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

## Team

Built by [@kunalshah017](https://github.com/kunalshah017)

## License

MIT
