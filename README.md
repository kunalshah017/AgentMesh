# AgentMesh

> A decentralized marketplace where AI tool providers register MCP tools, an orchestrator discovers and coordinates them via P2P mesh, pays them per task, and tracks reputation — all without a central server.

**ETHGlobal Open Agents Hackathon 2026**

## Architecture

```
    ┌─────────────────┐
    │   DASHBOARD      │  Next.js + React (Brutalist UI)
    │   (chat + mesh   │
    │    visualizer)   │
    └────────┬─────────┘
             │ WebSocket
    ┌────────▼─────────┐
    │  ORCHESTRATOR     │  LLM brain (0G Compute)
    │  AXL Node :9002   │  Task planning + coordination
    └──┬─────┬──────┬──┘
       │     │      │     AXL P2P mesh (encrypted)
  ┌────▼──┐ ┌▼────┐ ┌▼─────────┐
  │RESEARCH│ │RISK │ │ EXECUTOR  │
  │:9012   │ │:9022│ │ :9032     │
  │DeFi    │ │Audit│ │ KeeperHub │
  │Scanner │ │     │ │ + Uniswap │
  └────────┘ └─────┘ └───────────┘
       │        │          │
       └────────┼──────────┘
                │
    ┌───────────▼──────────┐
    │  ONCHAIN LAYER        │
    │  0G Chain (registry)  │
    │  ENS (identity)       │
    │  x402 (payments)      │
    └───────────────────────┘
```

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment config
cp .env.example .env
# → Fill in API keys

# Start the dashboard
bun run dev:client

# Start agents (in separate terminals)
bun run dev:orchestrator
bun run dev:researcher
bun run dev:risk-analyst
bun run dev:executor
```

## Project Structure

```
agentmesh/
├── client/                    # Next.js dashboard (Brutalist UI)
│   └── src/
│       ├── app/               # App router pages
│       └── components/        # React components
├── packages/
│   ├── shared/                # Types, constants, utilities
│   ├── orchestrator/          # Orchestrator agent (LLM brain)
│   ├── researcher/            # Researcher tool provider
│   ├── risk-analyst/          # Risk analyst tool provider
│   ├── executor/              # Executor tool provider
│   └── contracts/             # Solidity contracts (0G Chain)
├── axl/                       # AXL node configs + setup
└── PROGRESS_REPORT.md         # Development roadmap & tracking
```

## Sponsor Integrations

| Sponsor        | Integration                                                    |
| -------------- | -------------------------------------------------------------- |
| **0G**         | Compute (LLM), Storage (memory), Chain (registry + reputation) |
| **Gensyn AXL** | All inter-agent P2P communication                              |
| **Uniswap**    | Trading API for token swaps                                    |
| **KeeperHub**  | MCP for reliable onchain execution                             |
| **ENS**        | Agent identity & discovery                                     |
| **x402**       | HTTP-native micropayments between agents                       |

## Tech Stack

- TypeScript + Bun (agent runtime)
- Next.js 15 + React 19 + Tailwind CSS v4 (frontend)
- Solidity + Hardhat (smart contracts on 0G Chain)
- Gensyn AXL (P2P mesh)
- 0G Compute/Storage/Chain (decentralized AI infra)

## License

MIT
