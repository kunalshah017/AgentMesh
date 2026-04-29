# AgentMesh — Progress Report & Roadmap

> **Hackathon:** ETHGlobal Open Agents 2026
> **Deadline:** Sunday, May 3rd, 2026 at 12:00 PM EDT
> **Started:** April 29, 2026

---

## Legend

- ✅ Complete
- 🔄 In Progress
- ⬜ Not Started
- ❌ Blocked
- 🔵 Stretch Goal

---

## PHASE 1: Foundation (Day 9 — April 29)

### 1.1 Project Setup

- ✅ Monorepo structure (Bun workspaces + Turborepo)
- ✅ Root configs (tsconfig, turbo.json, .gitignore, .env.example)
- ✅ Shared package (@agentmesh/shared) — types, constants, utilities
- ✅ Orchestrator package scaffolded
- ✅ Researcher package scaffolded
- ✅ Risk Analyst package scaffolded
- ✅ Executor package scaffolded
- ✅ Smart contracts package (Hardhat + Solidity)
- ✅ Next.js frontend scaffolded (Brutalist UI)
- ✅ AXL config templates for 4 nodes
- ✅ Install all dependencies with bun
- ✅ Verify TypeScript compiles across all packages

### 1.2 AXL P2P Setup

- ⬜ Install Go 1.25.5 (pin GOTOOLCHAIN)
- ⬜ Clone and build AXL binary
- ⬜ Generate Ed25519 keys for 4 nodes
- ⬜ Boot 2+ AXL nodes on different ports
- ⬜ Verify nodes discover each other
- ⬜ Test MCP message passing between nodes
- ⬜ Install AXL Python deps (mcp_routing)

### 1.3 0G Compute Integration

- ✅ Get 0G API key (app-sk-... via 0g-compute-cli)
- ✅ Deposit OG tokens from faucet.0g.ai (6.1 OG deposited)
- ✅ Fund provider: qwen/qwen-2.5-7b-instruct (0xa48f...)
- ✅ Verify LLM calls work (Status 200, response confirmed)
- ⬜ Test task planning prompt with 0G Compute

### 1.4 Smart Contracts

- ✅ Get 0G testnet tokens from faucet (6.1 OG)
- ⬜ Deploy AgentRegistry.sol on 0G Chain testnet
- ⬜ Deploy ReputationTracker.sol on 0G Chain testnet
- ⬜ Verify contracts on chainscan.0g.ai
- ⬜ Record contract addresses

### 1.5 ENS Setup

- ⬜ Get Sepolia ETH from faucet
- ⬜ Register agentmesh.eth on Sepolia
- ⬜ Create subnames: orchestrator, researcher, analyst, executor
- ⬜ Set text records (capabilities, axl-key, price-per-task)
- ⬜ Verify ENS resolution with viem

---

## PHASE 2: Agent Core (Day 10 — April 30)

### 2.1 Orchestrator Agent

- ✅ Task planner: goal → subtask decomposition via 0G Compute
- ✅ Tool discovery: query ENS for tools by capability
- ⬜ AXL MCP client: call remote tools via P2P
- ✅ Event system: SSE stream to dashboard
- ✅ WebSocket server for real-time dashboard communication
- ✅ Conversation state management
- ✅ Local mode: direct tool calls without AXL (dev/demo)
- ✅ Fallback keyword-based planner (works without LLM)

### 2.2 Researcher Tool Provider

- ✅ MCP server registered with AXL router
- ✅ defi-scan: DeFiLlama API integration (real data)
- ✅ token-info: CoinGecko API integration (real data)
- ✅ protocol-stats: DeFiLlama protocol API (real data)
- ✅ x402 server: return HTTP 402 + charge per call

### 2.3 Executor Tool Provider

- ✅ MCP server registered with AXL router
- ✅ Uniswap Trading API: check_approval → quote → swap (mock mode)
- ⬜ KeeperHub MCP: workflow creation + execution (now supports 0G Chain!)
- ✅ check-balance: viem onchain balance queries (mock mode)
- ✅ x402 server: charge per execution

### 2.4 x402 Payment Flow

- ✅ x402 payment middleware on all tool providers
- ✅ Tool providers return HTTP 402 with payment headers
- ✅ Orchestrator creates payment proof and retries
- ✅ Payment events emitted to dashboard
- ⬜ End-to-end payment test between 2 nodes (needs AXL)

### 2.5 0G Storage Integration

- ✅ Save conversation logs to 0G Storage (with mock fallback)
- ✅ Store agent state snapshots
- ⬜ Cache research results in 0G Storage KV

---

## PHASE 3: End-to-End Integration (Day 11 — May 1)

### 3.1 Full Pipeline

- ⬜ User goal → Orchestrator → Researcher → Risk → Executor → Result
- ⬜ Wire AXL MCP calls through actual P2P mesh
- ⬜ x402 payments settle between every tool call
- ⬜ Results flow back to dashboard in real-time

### 3.2 Frontend Dashboard

- ✅ Chat interface sends goals to Orchestrator
- ✅ Agent activity feed (SSE events in real-time)
- ✅ Network graph shows live AXL mesh topology
- ✅ Payment flow visualization (PaymentTicker + enhanced ChatPanel)
- ✅ Task progress indicators

### 3.3 Risk Analyst Tool Provider

- ✅ MCP server registered with AXL router
- ✅ risk-assess: protocol risk scoring
- ✅ contract-audit: audit status lookup
- ✅ x402 server: charge per analysis

### 3.4 End-to-End Debugging

- ⬜ Test "Find best yield for 10 ETH" full flow
- ⬜ Test "Swap 5 ETH to USDC" full flow
- ⬜ Test "Check my portfolio" full flow
- ⬜ Fix edge cases, timeouts, error handling

---

## PHASE 4: Polish & Demo (Day 12 — May 2)

### 4.1 Demo Hardening

- ⬜ Pre-warm all AXL nodes for demo
- ⬜ Add mock fallbacks for every external API
- ⬜ Test full demo flow 5+ times end-to-end
- ⬜ Optimize response times (caching, parallel calls)

### 4.2 Reputation System

- 🔵 Update reputation on 0G Chain after each task
- 🔵 Display reputation scores in dashboard
- 🔵 Query reputation from contract in tool discovery

### 4.3 Demo Video (2-4 min)

- ⬜ Script the demo flow
- ⬜ Record screen capture at 720p+
- ⬜ Voice-over explaining architecture
- ⬜ Show: goal → discovery → tool calls → payments → result

### 4.4 Documentation

- ⬜ README with architecture diagram + setup guide
- ⬜ FEEDBACK.md for Uniswap
- ⬜ List all contract addresses
- ⬜ Document sponsor SDK usage

---

## PHASE 5: Submit (Day 13 — May 3, by 12:00 PM EDT)

### 5.1 Submission

- ⬜ Final end-to-end test
- ⬜ Push to GitHub (public repo)
- ⬜ Upload demo video
- ⬜ Fill submission form: project name, description, team info
- ⬜ Select 3 partner prizes: 0G, Gensyn, Uniswap
- ⬜ List contract deployment addresses
- ⬜ Verify git history shows incremental progress

---

## Sponsor Integration Checklist

| Sponsor       | Layer       | Status | What We Use                                                               |
| ------------- | ----------- | ------ | ------------------------------------------------------------------------- |
| **0G**        | Compute     | ✅     | LLM inference (qwen-2.5-7b-instruct) via OpenAI-compat API — LIVE         |
| **0G**        | Storage     | 🔄     | Agent memory + conversation logs (with mock fallback)                     |
| **0G**        | Chain       | 🔄     | AgentRegistry.sol + ReputationTracker.sol (compiled, deploy script ready) |
| **Gensyn**    | AXL         | ⬜     | All P2P communication (MCP + A2A between 4 nodes)                         |
| **Uniswap**   | Trading API | ⬜     | Token swaps (check_approval → quote → swap)                               |
| **KeeperHub** | MCP         | ⬜     | Reliable onchain execution (workflows, web3 actions) — now supports 0G Chain! |
| **ENS**       | Identity    | 🔄     | viem ENS resolution + local registry fallback                             |
| **x402**      | Payments    | ✅     | HTTP 402 middleware + payment proofs on all providers                     |

---

## Contract Addresses

| Contract          | Network    | Address              |
| ----------------- | ---------- | -------------------- |
| AgentRegistry     | 0G Testnet | _pending deployment_ |
| ReputationTracker | 0G Testnet | _pending deployment_ |

---

## API Keys Needed

| Service                  | Status | Where to Get                     |
| ------------------------ | ------ | -------------------------------- |
| 0G Compute               | ✅     | 0g-compute-cli get-secret        |
| Uniswap                  | ✅     | developers.uniswap.org/dashboard |
| KeeperHub                | ✅     | app.keeperhub.com                |
| Alchemy/Infura (Sepolia) | ⬜     | For ENS resolution               |

---

## Testnet Tokens Needed

| Token             | Network          | Status | Faucet                   |
| ----------------- | ---------------- | ------ | ------------------------ |
| OG tokens         | 0G Testnet       | ✅     | faucet.0g.ai (6.1 OG)   |
| Sepolia ETH       | Ethereum Sepolia | ⬜     | ethglobal.com/faucet     |
| Base Sepolia USDC | Base Sepolia     | ⬜     | For x402 payment testing |

---

_Last updated: April 30, 2026_
