# AI Usage Documentation

> **Project:** AgentMesh  
> **Hackathon:** ETHGlobal Open Agents 2026

---

## Tools Used

| Tool | Purpose | Scope |
|------|---------|-------|
| GitHub Copilot (Claude) | Code generation, architecture design, debugging | All packages |
| 0G Compute (qwen-2.5-7b-instruct) | Runtime LLM inference for task planning | Orchestrator agent |

---

## How AI Was Used

### Design Decisions — Human-Driven

All architectural decisions were made by the developer:

- Marketplace architecture (1 brain + N tools)
- Sponsor integration choices (0G all 3 layers, AXL, Uniswap, KeeperHub, ENS)
- x402 payment protocol selection
- EIP-712 signing approach for payment proofs
- 0G KV Storage SDK integration path
- Agent responsibility boundaries (orchestrator vs researcher vs executor)

### Code Generation — AI-Accelerated

AI assisted with implementation of designs:

- TypeScript boilerplate (Express servers, type definitions)
- ethers.js integration patterns (signTypedData, Contract, Interface)
- viem integration for balance queries
- AXL HTTP client wrappers
- Uniswap Trading API request/response handling
- React component scaffolding (Next.js dashboard)
- Solidity contracts (AgentRegistry, ReputationTracker)

### Debugging — AI-Assisted

- Go toolchain compatibility issues (GOTOOLCHAIN=go1.25.5)
- 0G Storage SDK API surface discovery
- EIP-712 domain parameter correctness
- MCP JSON-RPC protocol compliance

---

## Rough Split

- **Architecture & Design:** 100% human
- **Implementation:** ~60% AI-generated, ~40% manual
- **Testing & Debugging:** ~50/50
- **Documentation:** ~70% AI-generated, 30% human editing

---

## Principles

1. AI was used as an implementation accelerator, not a decision-maker
2. All AI-generated code was reviewed and understood before committing
3. Integration patterns were verified against official documentation
4. No AI-generated code was blindly trusted — all implementations were tested against live networks
