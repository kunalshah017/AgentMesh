# AgentMesh — Master Plan

> **Hackathon:** ETHGlobal Open Agents (Online)
> **Deadline:** Sunday, May 3rd, 2026 at 12:00 PM EDT
> **Team Size:** Up to 5 | **Partner Prizes:** Select up to 3
> **Last validated:** April 29, 2026

---

## Table of Contents

1. [What Is AgentMesh?](#1-what-is-agentmesh)
2. [Architecture](#2-architecture)
3. [How It Works — Step by Step](#3-how-it-works--step-by-step)
4. [Core Features](#4-core-features)
5. [What Each Agent Does](#5-what-each-agent-does)
6. [Task Scope](#6-task-scope)
7. [Technology Validation](#7-technology-validation)
8. [Sponsor Tracks & Prizes](#8-sponsor-tracks--prizes)
9. [Tech Stack](#9-tech-stack)
10. [Build Plan](#10-build-plan)
11. [Demo Script](#11-demo-script)
12. [Feasibility Risks & Mitigations](#12-feasibility-risks--mitigations)
13. [Minimal Viable Demo (Fallback)](#13-minimal-viable-demo-fallback)
14. [Competitive Landscape](#14-competitive-landscape)
15. [Dependencies & Setup](#15-dependencies--setup)
16. [Submission Checklist](#16-submission-checklist)
17. [Key Resources](#17-key-resources)

---

## 1. WHAT IS AGENTMESH?

**One-liner:** A decentralized marketplace where AI tool providers register MCP tools, an orchestrator discovers and coordinates them via P2P mesh, pays them per task, and tracks reputation — all without a central server.

### The Problem

Today, AI agents are siloed. If you have a "research tool" and a "trading tool," they can't find each other, negotiate, or pay each other without a centralized platform. AgentMesh makes this decentralized — tool providers operate like independent freelancers on an open marketplace, using crypto-native infrastructure for everything.

### Architecture Model: Tool Provider

Owners provide **MCP tools** (functions with input→output), NOT full LLM-powered agents. The **Orchestrator** (which WE run) has the LLM brain via 0G Compute. Tools are "dumb" functions that do one job well.

- **Tool providers** = MCP services that expose endpoints (e.g., `scan-yields`, `risk-assess`, `execute-swap`)
- **Orchestrator** = The only agent with LLM reasoning, plans tasks, calls tools, manages payments
- **Why:** Simpler for hackathon, cheaper (only 1 LLM), tool providers are lightweight

### Why It Wins

| Criteria         | How AgentMesh Nails It                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Originality**  | First P2P agent marketplace that's truly decentralized — no central server, agents find and pay each other directly |
| **Technicality** | Multi-agent coordination, P2P networking, onchain payments, decentralized compute — technically deep                |
| **Practicality** | Solves real problem: how do agents find, trust, and pay other agents for services?                                  |
| **Usability**    | Human dashboard to watch agents work + chat interface to give agents goals                                          |
| **WOW Factor**   | Live demo: spawn 3+ nodes, watch them discover each other, split work, and settle payments autonomously             |

---

## 2. ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     HUMAN DASHBOARD (Next.js)                    │
│  "Find me the best yield for 10 ETH across DeFi protocols"      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  ORCHESTRATOR   │
                    │  AGENT (Node 1) │ ← ENS: orchestrator.agentmesh.eth
                    │  on AXL :9002   │ ← Has the LLM brain (0G Compute)
                    └───┬────┬────┬───┘
              ┌─────────┘    │    └─────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────────┐ ┌───▼────────────┐
     │ RESEARCHER      │ │ RISK       │ │ EXECUTOR        │
     │ TOOL (Node 2)   │ │ ANALYST    │ │ TOOL (Node 4)   │
     │ AXL :9012       │ │ (Node 3)   │ │ AXL :9032       │
     │                 │ │ AXL :9022  │ │                 │
     │ MCP Services:   │ │ MCP Svc:   │ │ MCP Services:   │
     │ • defi-scan     │ │ • risk-    │ │ • execute-swap  │
     │ • token-info    │ │   assess   │ │ • execute-dep.  │
     │ • protocol-stat │ │ • contract │ │ • check-balance │
     │                 │ │   -audit   │ │                 │
     │ Charges x402    │ │ Charges    │ │ Uses KeeperHub  │
     │ per call        │ │ x402       │ │ + Uniswap API   │
     └────────────────┘ └────────────┘ └─────────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     SHARED STATE LAYER       │
              │  0G Storage (KV + Log)       │
              │  Agent Memory & History      │
              │  ENS Agent Registry          │
              │  0G Chain (Reputation)       │
              └─────────────────────────────┘
```

### Detailed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HUMAN INTERFACE (Next.js + React)                     │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Chat Input   │  │ Agent Activity    │  │ Network Graph (AXL mesh)       │ │
│  │ "Find yield  │  │ Feed (real-time   │  │ [Node1]──[Node2]               │ │
│  │  for 10 ETH" │  │  SSE stream)     │  │    \      /                     │ │
│  └──────┬───────┘  └──────────────────┘  │   [Node3]──[Node4]             │ │
│         │                                 └─────────────────────────────────┘ │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │ WebSocket
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR AGENT                                   AXL Node 1 (:9002)    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Agent Runtime (TypeScript/Node.js)                                  │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────────┐ │   │
│  │  │ Task      │  │ Agent     │  │ 0G       │  │ Payment Manager   │ │   │
│  │  │ Planner   │  │ Discovery │  │ Compute  │  │ (x402 client)     │ │   │
│  │  │           │  │ (ENS      │  │ Client   │  │                    │ │   │
│  │  │ Breaks    │  │  resolver)│  │ (OpenAI  │  │ Signs payments    │ │   │
│  │  │ goal into │  │           │  │  compat) │  │ when tools return │ │   │
│  │  │ subtasks  │  │ Finds     │  │          │  │ HTTP 402          │ │   │
│  │  │           │  │ tools by  │  │ Reasoning│  │                    │ │   │
│  │  │           │  │ capability│  │ & planning│  │                    │ │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └────────────────────┘ │   │
│  │  ┌──────────┐  ┌────────────────────────────────────────────────┐  │   │
│  │  │ 0G       │  │ AXL MCP Client                                 │  │   │
│  │  │ Storage  │  │ POST /mcp/{peer_key}/{service_name}            │  │   │
│  │  │ (memory) │  │ Calls tool providers' services via P2P mesh    │  │   │
│  │  └──────────┘  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │ AXL P2P mesh (encrypted, no central server)
          ├────────────────────────┬────────────────────────┐
          ▼                        ▼                        ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐
│ RESEARCHER TOOL   │  │ RISK ANALYST TOOL │  │ EXECUTOR TOOL             │
│ AXL Node 2 (:9012)│  │ AXL Node 3 (:9022)│  │ AXL Node 4 (:9032)       │
│                   │  │                   │  │                           │
│ MCP Services:     │  │ MCP Services:     │  │ MCP Services:             │
│ • defi-scan       │  │ • risk-assess     │  │ • execute-swap            │
│ • token-info      │  │ • contract-audit  │  │ • execute-deposit         │
│ • protocol-stats  │  │ • portfolio-risk  │  │ • check-balance           │
│                   │  │                   │  │                           │
│ Uses:             │  │ Uses:             │  │ Uses:                     │
│ • Public DeFi APIs│  │ • Contract data   │  │ • KeeperHub MCP           │
│   (DeFiLlama etc) │  │ • Audit databases │  │   (reliable execution)    │
│ • 0G Storage      │  │ • 0G Storage      │  │ • Uniswap Trading API     │
│   (research cache)│  │   (risk models)   │  │   (swaps)                 │
│ • x402 server     │  │ • x402 server     │  │ • x402 server             │
│   (charges per    │  │   (charges per    │  │   (charges per            │
│    call)          │  │    call)          │  │    call)                  │
└───────────────────┘  └───────────────────┘  └───────────────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   ▼
                    ┌──────────────────────────┐
                    │   ONCHAIN LAYER           │
                    │                          │
                    │  0G Chain:               │
                    │  • AgentRegistry.sol     │
                    │  • ReputationTracker.sol │
                    │                          │
                    │  ENS (Sepolia):          │
                    │  • agentmesh.eth         │
                    │  • *.agentmesh.eth       │
                    │    (tool subnames)       │
                    │                          │
                    │  Base / Ethereum:        │
                    │  • x402 USDC payments    │
                    │  • Uniswap swaps         │
                    │  • KeeperHub executions  │
                    └──────────────────────────┘
```

---

## 3. HOW IT WORKS — STEP BY STEP

### User Flow: "Find me the best yield for 10 ETH"

```
Step 1: USER → Dashboard
    User types goal in the Next.js chat interface

Step 2: DASHBOARD → ORCHESTRATOR (via AXL Node 1)
    Dashboard sends task to the Orchestrator via WebSocket

Step 3: ORCHESTRATOR thinks (0G Compute)
    "I need: a DeFi researcher, a risk analyst, and an executor"
    Queries ENS: looks up tools with capability="defi-research" etc.
    Gets back: researcher.agentmesh.eth (AXL key: abc123...)
                analyst.agentmesh.eth   (AXL key: def456...)
                executor.agentmesh.eth  (AXL key: ghi789...)

Step 4: ORCHESTRATOR → RESEARCHER (via AXL P2P)
    POST http://localhost:9002/mcp/{researcher_key}/defi-scan
    Payload: { "method": "tools/call", "params": {
      "name": "scan-yields", "arguments": { "token": "ETH", "amount": "10" }
    }}

    Researcher returns HTTP 402 → Orchestrator pays 0.02 USDC via x402
    Researcher scans Aave, Compound, Lido via public APIs
    Returns: [
      { protocol: "Lido", apy: "4.2%", risk: "low" },
      { protocol: "Pendle", apy: "12.1%", risk: "medium" }
    ]

Step 5: ORCHESTRATOR → RISK ANALYST (via AXL P2P)
    Sends yield options for risk assessment
    Risk tool analyzes smart contract risks, TVL, audit status
    Returns: { "lido": "SAFE", "pendle": "CAUTION - low liquidity" }

Step 6: ORCHESTRATOR decides (0G Compute)
    Picks Lido (safe + decent yield)
    Saves decision reasoning to 0G Storage Log

Step 7: ORCHESTRATOR → EXECUTOR (via AXL P2P)
    "Swap 10 ETH and deposit into Lido"
    Executor uses KeeperHub MCP:
      - Step 1: Check ETH balance (web3/check-balance)
      - Step 2: Approve + deposit into Lido (web3/write-contract)
    KeeperHub handles: gas estimation, retry logic, nonce management

Step 8: RESULTS → DASHBOARD
    Reputation scores updated on 0G Chain
    Full conversation log saved to 0G Storage
    User sees: "Done! 10 ETH deposited in Lido at 4.2% APY. Tx: 0x..."
```

---

## 4. CORE FEATURES

### 1. Tool Discovery via ENS

- Each tool provider registers as an ENS subname (e.g., `researcher.agentmesh.eth`)
- Text records store: capabilities, AXL public key, pricing (USDC per task), reputation score
- Orchestrator resolves tools by querying ENS for capabilities it needs

### 2. P2P Communication via AXL (Gensyn)

- Each node runs its own AXL instance — truly decentralized, no message broker
- Uses built-in MCP protocol for structured tool calls between nodes
- Uses A2A protocol for task delegation and status updates
- End-to-end encrypted, works behind NATs

### 3. Autonomous Payments via x402 + Uniswap

- When Orchestrator calls a tool, tool responds with HTTP 402
- Orchestrator pays via x402 using Uniswap API for token swaps (pay in any token, settle in USDC)
- Uses the `pay-with-any-token` skill from uniswap-ai
- KeeperHub handles reliable execution (retry, gas optimization, MEV protection)

### 4. Reliable Onchain Execution via KeeperHub

- All DeFi operations (swaps, LP management, etc.) go through KeeperHub MCP
- Retry logic, gas optimization, private routing
- Full audit trail of every action
- Tools pay KeeperHub via x402/MPP

### 5. Decentralized AI & Memory via 0G

- **0G Compute** for Orchestrator LLM inference (no centralized OpenAI dependency)
- **0G Storage KV** for real-time agent state (current tasks, working memory)
- **0G Storage Log** for conversation history, task logs, audit trail
- **0G Chain** for agent registry smart contract + reputation system

### 6. Reputation & Trust (on 0G Chain)

- Smart contract tracks: tasks completed, success rate, response time, earnings
- After each interaction, reputation is updated on-chain
- Reputation is composable — other apps can read it

---

## 5. WHAT EACH AGENT DOES

### Orchestrator Agent (the only one with an LLM)

- **Role:** Central coordinator — receives user goals, breaks into subtasks, delegates to tools
- **Tools:** ENS resolution, AXL MCP calls, 0G Compute (planning), 0G Storage (conversation log)
- **Does NOT:** Execute onchain transactions directly
- **Prompt template:** System prompt with task decomposition instructions, available tool registry

### Researcher Tool Provider

- **Role:** Scans DeFi protocols for opportunities (yields, token prices, TVL, etc.)
- **Implements:** Public DeFi API calls (DeFiLlama, DexScreener), 0G Storage (cache)
- **MCP Services exposed:** `defi-scan`, `token-info`, `protocol-stats`
- **Charges:** ~0.01-0.05 USDC per query via x402

### Risk Analyst Tool Provider

- **Role:** Evaluates risk of DeFi protocols, smart contracts, token positions
- **Implements:** Contract analysis, audit database lookups
- **MCP Services exposed:** `risk-assess`, `contract-audit`, `portfolio-risk`
- **Charges:** ~0.02-0.05 USDC per analysis via x402

### Executor Tool Provider

- **Role:** Executes onchain transactions reliably
- **Implements:** KeeperHub MCP (workflows, web3 actions), Uniswap Trading API (swaps)
- **MCP Services exposed:** `execute-swap`, `execute-deposit`, `check-balance`
- **Charges:** ~0.05 USDC per execution + gas via x402

---

## 6. TASK SCOPE

### Tier 1: Core Demo Tasks (What we build for hackathon)

| Task                        | Tools Involved                              | How It Works                                                          |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| **DeFi Yield Optimization** | Orchestrator + Researcher + Risk + Executor | Scan protocols, assess risk, execute best strategy                    |
| **Token Swap**              | Orchestrator + Executor                     | "Swap 5 ETH to USDC" → Uniswap Trading API via KeeperHub              |
| **Portfolio Analysis**      | Orchestrator + Researcher                   | Check balances across chains, compute allocation, suggest rebalancing |

### Tier 2: Stretch Goals (If time permits)

| Task                            | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| **Multi-step DeFi Strategy**    | Borrow on Aave → Swap on Uniswap → LP on Curve (tool chain)   |
| **Tool Marketplace**            | Third-party devs register their own specialist tools          |
| **Natural Language Automation** | "Every Monday, rebalance my portfolio to 60% ETH 40% stables" |

---

## 7. TECHNOLOGY VALIDATION

All APIs/SDKs confirmed working as of April 28, 2026.

### ✅ 0G Compute

**What:** Decentralized LLM inference — OpenAI-compatible API, just swap `baseURL`.
**Models:** `qwen/qwen-2.5-7b-instruct` and others on compute-marketplace.0g.ai
**SDK:** `@0glabs/0g-serving-broker`

```typescript
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: `${process.env.ZG_SERVICE_URL}/v1/proxy`,
  apiKey: process.env.ZG_API_SECRET, // app-sk-... key
});
const completion = await client.chat.completions.create({
  model: "qwen/qwen-2.5-7b-instruct",
  messages: [{ role: "user", content: "Analyze Lido staking risks" }],
});
```

**Setup:** CLI-based (`0g-compute-cli setup-network`, `deposit`, `transfer-fund`, `get-secret`)
**Cost:** Pay per request, deposit OG tokens first via faucet.0g.ai (testnet)

---

### ✅ 0G Storage

**What:** Persistent agent memory — upload JSON blobs, get rootHash, download later.
**SDK:** `@0gfoundation/0g-ts-sdk`

```typescript
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const indexer = new Indexer("https://indexer-storage-testnet-turbo.0g.ai");

// Save agent memory
const data = new MemData(new TextEncoder().encode(JSON.stringify(agentState)));
const [rootHash, err] = await indexer.upload(data, RPC_URL, signer);

// Load agent memory
await indexer.download(rootHash, "./state.json", true);
```

---

### ✅ 0G Chain

**What:** EVM-compatible L1 for deploying AgentRegistry + Reputation smart contracts.

- Testnet RPC: `https://evmrpc-testnet.0g.ai`
- Faucet: faucet.0g.ai
- Explorer: chainscan.0g.ai
- Standard Solidity + Hardhat/Foundry

---

### ✅ Gensyn AXL (P2P Communication)

**What:** Go binary. HTTP API on localhost:9002. Built-in MCP & A2A routing.

**Three communication patterns:**

1. **Send/Recv (fire-and-forget):** `POST /send` with `X-Destination-Peer-Id` header
2. **MCP (request-response):** `POST /mcp/{peer_key}/service_name` — JSON-RPC 2.0
3. **A2A (agent-to-agent):** `POST /a2a/{peer_key}` — Google A2A protocol

```bash
# Orchestrator calls Researcher's "defi-scan" MCP service
curl -X POST http://127.0.0.1:9002/mcp/{researcher_key}/defi-scan \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"scan-yields","arguments":{"token":"ETH"}}}'
```

**Setup per node:**

1. Build: `git clone https://github.com/gensyn-ai/axl && make build`
2. Generate key: `openssl genpkey -algorithm ed25519 -out private.pem`
3. Configure peers in `node-config.json`
4. Start: `./node -config node-config.json`
5. Start MCP router: `python -m mcp_routing.mcp_router --port 9003`
6. Register services with router
7. Optionally start A2A server: `python -m a2a_serving.a2a_server --port 9004`

**Requirements:** Go 1.25.5 (NOT 1.26 — gvisor compat issue). Use `GOTOOLCHAIN=go1.25.5`.

---

### ✅ Uniswap Trading API

**What:** REST API for token swaps.
**Flow:** `GET /check_approval` → `POST /quote` → `POST /swap` → sign & submit
**Supports:** Classic (v2/v3/v4), UniswapX (gasless), CHAINED (cross-chain)
**API keys:** Free at developers.uniswap.org/dashboard
**AI skills:** `swap-integration`, `pay-with-any-token`

**Note:** UniswapX minimums: 300 USDC mainnet, 1000 USDC L2 — use Classic routing for smaller amounts.

---

### ✅ KeeperHub MCP

**What:** Remote MCP server for reliable onchain execution.
**Endpoint:** `https://app.keeperhub.com/mcp`

**MCP Tools:**
| Tool | What it does |
|---|---|
| `list_workflows` | Find available automation workflows |
| `create_workflow` | Build a workflow with triggers, actions, conditions |
| `execute_workflow` | Run a workflow, get execution ID |
| `get_execution_status` | Poll for completion |
| `ai_generate_workflow` | Generate workflow from natural language |
| `search_plugins` | Find plugins (Aave, Uniswap, Lido, Compound, etc.) |

**Web3 Actions:**

- Read: `web3/check-balance`, `web3/check-token-balance`, `web3/read-contract`
- Write: `web3/transfer-funds`, `web3/transfer-token`, `web3/write-contract`

**Supported chains:** Ethereum, Base, Arbitrum, Polygon, Sepolia
**DeFi Plugins:** Aave V3, Compound V3, Uniswap, Lido, Morpho, Pendle, Curve, Yearn V3, Sky (MakerDAO)
**Payment:** ~$0.05/call via x402 (Base USDC)
**Hard limits:** Max 100 USDC/transfer, only Base USDC

---

### ✅ x402 Protocol

**What:** HTTP-native agent-to-agent payments. 75M+ txns, $24M+ volume.

```
Tool Provider returns HTTP 402 + PaymentRequired header
  → Orchestrator signs x402 payment (USDC via EIP-3009)
  → Retries request with PAYMENT-SIGNATURE header
  → Facilitator verifies, settles on-chain
  → Tool Provider serves the response
```

**SDKs:** TypeScript, Python, Go
**KeeperHub already uses x402 natively.**

---

### ✅ ENS

**What:** Agent identity + discovery via subnames.

- Subnames via NameWrapper contract on Sepolia
- Text records for metadata: `capabilities`, `axl-key`, `price-per-task`, `reputation-score`
- Resolution via viem (built-in ENS support)
- Pattern proven at ETHGlobal Cannes (WorldAgent.ID, A2A projects)

---

## 8. SPONSOR TRACKS & PRIZES

### Target: 0G + Gensyn + Uniswap (select these 3)

| Sponsor               | Integration Depth                                          | Track                        | Prize              |
| --------------------- | ---------------------------------------------------------- | ---------------------------- | ------------------ |
| **0G** ⭐             | ALL layers (Compute, Storage, Chain) — deepest integration | Autonomous Agents & Swarms   | $7,500 (5 winners) |
| **Gensyn** ⭐         | Core architecture — all inter-agent communication via AXL  | Best Application of AXL      | $5,000 (3 winners) |
| **Uniswap** ⭐        | Trading API for payments, pay-with-any-token via x402      | Best Uniswap API Integration | $5,000 (3 winners) |
| **KeeperHub** (bonus) | MCP for reliable execution + x402 payments                 | Best Innovative Use          | $4,500 (3 winners) |
| **ENS** (bonus)       | Agent identity & discovery layer                           | TBD                          | $5,000             |

> KeeperHub and ENS integrations are organic and will qualify for async judging even without explicit selection.

### Judging Criteria

| Criteria                 | What Judges Look For                           |
| ------------------------ | ---------------------------------------------- |
| **Technicality**         | Complex problem + sophisticated solution       |
| **Originality**          | New idea OR creative twist on existing problem |
| **Practicality**         | Complete, functional, could be used TODAY      |
| **Usability (UI/UX/DX)** | Intuitive, easy to interact with               |
| **WOW Factor**           | Leaves a lasting impression                    |

### What Wins at ETHGlobal (from past winner analysis)

1. **Deep sponsor integration** — Use ALL layers of a sponsor's stack
2. **Working demo** — Must actually work live, not just slides
3. **Novel combination** — Combine 2-3 hot trends in a way nobody else has
4. **Real utility** — Would someone actually use this?
5. **Clean UX** — Chat interfaces, simple flows
6. **Multi-sponsor coverage** — Projects that integrate 2-3 sponsors maximize prize chances

### Hackathon Rules

- All code must be written DURING the hackathon (use version control!)
- AI tools allowed but must be documented
- Open source libraries & boilerplates are fine
- 2-4 min demo video required
- Can apply to up to 3 Partner Prizes

---

## 9. TECH STACK

| Layer             | Technology                              |
| ----------------- | --------------------------------------- |
| Frontend          | Next.js 16 + React 19 + Tailwind CSS v4 |
| Agent Runtime     | TypeScript + Node.js                    |
| AI Inference      | 0G Compute (qwen/qwen-2.5-7b-instruct)  |
| P2P Communication | Gensyn AXL (MCP + A2A)                  |
| Onchain Execution | KeeperHub MCP + viem                    |
| Payments          | x402 + Uniswap Trading API              |
| Agent Identity    | ENS subnames + text records             |
| State Storage     | 0G Storage (KV + Log)                   |
| Smart Contracts   | Solidity on 0G Chain (Hardhat)          |
| Agent Registry    | Custom contract + reputation tracking   |

---

## 10. BUILD PLAN

> Today is Day 9. We have ~4 days. Adjusted plan below.

### Day 9 (April 29) — Foundation Sprint

| Priority   | Tasks                                                            |
| ---------- | ---------------------------------------------------------------- |
| **MUST**   | Project setup: monorepo, install all SDKs                        |
| **MUST**   | AXL: Build binary, get 2+ nodes communicating on different ports |
| **MUST**   | 0G Compute: Connect to testnet, verify LLM calls work            |
| **MUST**   | Smart contract: Deploy AgentRegistry on 0G Chain                 |
| **SHOULD** | ENS: Register agentmesh.eth subnames on Sepolia                  |

### Day 10 (April 30) — Agent Core

| Priority   | Tasks                                                             |
| ---------- | ----------------------------------------------------------------- |
| **MUST**   | Orchestrator agent: task planning via 0G Compute, AXL MCP calling |
| **MUST**   | Researcher tool: MCP service exposing defi-scan on AXL node       |
| **MUST**   | Executor tool: KeeperHub MCP + Uniswap API integration            |
| **MUST**   | x402 payments: Orchestrator pays tools per call                   |
| **SHOULD** | 0G Storage: Save/load conversation logs                           |

### Day 11 (May 1) — End-to-End Integration

| Priority   | Tasks                                                          |
| ---------- | -------------------------------------------------------------- |
| **MUST**   | Wire full flow: User → Orchestrator → Tools → Execute → Result |
| **MUST**   | Frontend dashboard: chat interface + agent activity feed       |
| **MUST**   | Debug the complete pipeline end-to-end                         |
| **SHOULD** | Risk analyst tool provider                                     |
| **SHOULD** | Network graph visualization (AXL mesh)                         |

### Day 12 (May 2) — Polish & Demo

| Priority   | Tasks                                                       |
| ---------- | ----------------------------------------------------------- |
| **MUST**   | Harden demo flow — make it bulletproof                      |
| **MUST**   | Record demo video (2-4 min)                                 |
| **MUST**   | Write README with architecture diagram + setup instructions |
| **MUST**   | Write FEEDBACK.md for Uniswap                               |
| **SHOULD** | Reputation system on 0G Chain                               |

### Day 13 (May 3) — Submit by 12:00 PM EDT

| Priority | Tasks                                                          |
| -------- | -------------------------------------------------------------- |
| **MUST** | Final testing                                                  |
| **MUST** | Submit: GitHub repo, demo video, contract addresses, team info |
| **MUST** | Select 3 partner prizes: 0G, Gensyn, Uniswap                   |

---

## 11. DEMO SCRIPT (3 min video)

1. **(0:00-0:20)** Quick intro — "AgentMesh is a decentralized marketplace where AI tool providers collaborate and get paid per task"
2. **(0:20-1:00)** Show dashboard. User types: "Find me the best yield strategy for 10 ETH"
3. **(1:00-1:40)** Watch Orchestrator discover tools via ENS, call them via AXL. Show the mesh in real-time — messages flowing between nodes.
4. **(1:40-2:20)** Researcher returns yield data. Risk tool flags one as high-risk. Orchestrator picks safe option (0G Compute reasoning).
5. **(2:20-2:50)** Executor swaps ETH→tokens via Uniswap, deposits via KeeperHub — with x402 micropayments settling between nodes. Show payment flow.
6. **(2:50-3:00)** Show reputation updates on 0G Chain, persistent memory in 0G Storage. "All decentralized. No central server."

---

## 12. FEASIBILITY RISKS & MITIGATIONS

| Risk                                  | Severity | Mitigation                                                                                       |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| **AXL requires Go 1.25.5** (not 1.26) | Low      | Pin `GOTOOLCHAIN=go1.25.5`                                                                       |
| **0G Compute model quality**          | Medium   | Qwen 2.5 7B is good for structured tasks. Cache-and-combine multiple calls for complex reasoning |
| **x402 between our own nodes**        | Low      | We control both sides. Use direct x402 TypeScript SDK                                            |
| **Running 4 AXL nodes locally**       | Low      | Each node needs different ports (9002, 9012, 9022, 9032)                                         |
| **ENS subname registration cost**     | Low      | Use Sepolia testnet. Free.                                                                       |
| **KeeperHub paid workflows**          | Low      | ~$0.05/call. Budget $5-10 for demo                                                               |
| **Demo reliability**                  | Medium   | Pre-warm AXL nodes. Have backup recordings. Test end-to-end daily                                |
| **Time crunch (4 days, 0 code)**      | HIGH     | Follow build plan strictly. MVP first (2 nodes, 1 flow), then expand                             |

### Key Technical Decisions

| Decision                             | Why                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| AXL over WebSocket                   | P2P, E2E encrypted, NAT traversal, built-in MCP/A2A, **what Gensyn judges for**                                   |
| 0G Compute over OpenAI               | Decentralized, pay-per-request onchain, OpenAI-compatible drop-in, **what 0G judges for**                         |
| KeeperHub over direct contract calls | Auto retry, gas optimization, private routing, audit trail, pre-built DeFi plugins, **what KeeperHub judges for** |
| x402 over direct transfers           | HTTP-native, facilitator verifies, standard across ecosystem, **KeeperHub already uses it**                       |

---

## 13. MINIMAL VIABLE DEMO (Fallback)

If running short on time, the absolute minimum that still hits all sponsors:

1. **2 AXL nodes** (Orchestrator + Researcher/Executor combo)
2. **1 MCP service** per node (not 3)
3. **0G Compute** for Orchestrator reasoning only
4. **0G Storage** for saving the conversation
5. **1 Uniswap swap** as the execution action
6. **ENS lookup** for tool discovery (read-only, pre-registered)
7. **Basic dashboard** showing chat + activity feed

This covers all 5 sponsors with minimal surface area. Expand from there.

---

## 14. COMPETITIVE LANDSCAPE

### Nobody has built this at recent ETHGlobal hackathons

Searched Cannes for: "agent", "mesh", "orchestrat", "swarm", "A2A" — no similar results.

| Project           | Event            | Similar?                | What It Does                                                                           |
| ----------------- | ---------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| **WorldAgent.ID** | Cannes (Winner)  | No — identity only      | Links human identity to agents via World ID                                            |
| **AI Sales Army** | Cannes           | Partially — multi-agent | Sales lead pipeline with specialized agents, but specific product not general platform |
| **Strarifi.xyz**  | Cannes           | No — single agent       | DeFi research agent using ASI/Fetch.ai                                                 |
| **aoxbt**         | Agentic Ethereum | Partially — swarm       | Agent swarm for alpha hunting, but closed system not open marketplace                  |

### conduct.chat

The closest existing project. Differences:

| Aspect   | conduct.chat          | AgentMesh                                    |
| -------- | --------------------- | -------------------------------------------- |
| P2P      | HTTP APIs             | **AXL mesh** (encrypted, NAT traversal)      |
| AI       | OpenAI                | **0G Compute** (decentralized)               |
| Payments | Smart contract escrow | **x402** (HTTP-native, instant)              |
| Identity | Contract registry     | **ENS** (decentralized, composable)          |
| Swaps    | None                  | **Uniswap Trading API** (pay-with-any-token) |

---

## 15. DEPENDENCIES & SETUP

| Dependency      | Install                                                                   | Version           |
| --------------- | ------------------------------------------------------------------------- | ----------------- |
| Node.js         | Pre-installed                                                             | 20+               |
| Go              | Install go@1.25                                                           | 1.25.5 (NOT 1.26) |
| Python          | Pre-installed                                                             | 3.10+             |
| 0G Compute SDK  | `npm install @0glabs/0g-serving-broker openai`                            | latest            |
| 0G Storage SDK  | `npm install @0gfoundation/0g-ts-sdk ethers`                              | latest            |
| AXL             | `git clone https://github.com/gensyn-ai/axl && make build`                | main              |
| AXL Python deps | `cd integrations && pip install -e .`                                     | latest            |
| Uniswap API     | HTTP REST (key from developers.uniswap.org)                               | v1                |
| x402 SDK        | `npm install x402`                                                        | v2                |
| KeeperHub MCP   | `claude mcp add --transport http keeperhub https://app.keeperhub.com/mcp` | latest            |
| KeeperHub CLI   | `npm install -g @keeperhub/cli`                                           | latest            |
| ENS             | `npm install viem` (built-in ENS support)                                 | latest            |
| Next.js         | `npx create-next-app@latest`                                              | 16                |

### Testnet Tokens Needed

- **0G testnet OG tokens** — faucet.0g.ai (for Compute + Storage + Chain)
- **Sepolia ETH** — ethglobal.com/faucet (for ENS)
- **Base Sepolia USDC** — for x402 payment testing

---

## 16. SUBMISSION CHECKLIST

- [ ] Project name & short description
- [ ] Public GitHub repo with README + setup instructions
- [ ] Architecture diagram
- [ ] Contract deployment addresses (0G Chain)
- [ ] Demo video (2-4 min, 720p+)
- [ ] Live demo link
- [ ] FEEDBACK.md (Uniswap requirement)
- [ ] Explain SDK/protocol features used per sponsor
- [ ] Team member names + Telegram + X
- [ ] Select 3 partner prizes: 0G, Gensyn, Uniswap
- [ ] Version control showing incremental progress

---

## 17. KEY RESOURCES

| Sponsor          | Links                                                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0G**           | [Builder Hub](https://build.0g.ai) · [Docs](https://docs.0g.ai) · [Compute Starter](https://github.com/0gfoundation/0g-compute-ts-starter-kit) · [Storage Starter](https://github.com/0gfoundation/0g-storage-ts-starter-kit) · [Telegram](https://t.me/+mQmldXXVBGpkODU1) |
| **Uniswap**      | [Developer Platform](https://developers.uniswap.org/) · [Uniswap AI](https://github.com/Uniswap/uniswap-ai) · [Trading API Docs](https://developers.uniswap.org/docs/trading/overview)                                                                                     |
| **Gensyn (AXL)** | [AXL Docs](https://docs.gensyn.ai/tech/agent-exchange-layer) · [GitHub](https://github.com/gensyn-ai/axl) · [Autoresearch Demo](https://github.com/gensyn-ai/collaborative-autoresearch-demo)                                                                              |
| **KeeperHub**    | [MCP Docs](https://docs.keeperhub.com/ai-tools) · [API Docs](https://docs.keeperhub.com/api) · [CLI](https://docs.keeperhub.com/cli)                                                                                                                                       |
| **ENS**          | [ens.domains](https://ens.domains)                                                                                                                                                                                                                                         |
| **x402**         | [x402.org](https://x402.org) · [GitHub](https://github.com/x402-foundation/x402) · [Docs](https://docs.x402.org)                                                                                                                                                           |

---

**Target prize pool: $7,500 (0G) + $5,000 (Gensyn) + $5,000 (Uniswap) = $17,500**
**Realistic target: $1,500 (0G) + $2,500 (Gensyn) + $2,500 (Uniswap) = $6,500+**
