# Gensyn AXL Integration Feedback

> **Project:** AgentMesh — Decentralized AI Agent Marketplace  
> **Hackathon:** ETHGlobal Open Agents 2026  
> **Integration:** AXL P2P Mesh (4-node MCP routing + A2A)

---

## What We Built

AgentMesh runs a **4-node AXL mesh** connecting our Orchestrator, Researcher, Risk Analyst, and Executor agents. All inter-agent tool calls route through AXL's MCP proxy, and the mesh handles peer discovery, key-based routing, and message delivery over Yggdrasil.

### Architecture

```
Orchestrator (9002) ←→ AXL Mesh ←→ Researcher (9012)
                     ←→           ←→ Risk Analyst (9022)
                     ←→           ←→ Executor (9032)
```

### Features Used

| Feature | Purpose |
|---------|---------|
| MCP Routing (`/mcp/{peer_key}/{service}`) | Cross-node tool calls |
| Topology API (`/api/topology`) | Network graph visualization |
| Ed25519 key pairs | Node identity + addressing |
| TCP transport (port 7000) | Node-to-node communication |

---

## What Worked Well

1. **MCP routing is elegant** — `POST /mcp/{peer_key}/{service}` is the perfect abstraction for agent-to-agent tool calls. It maps 1:1 to the MCP spec, meaning our existing MCP tool servers work unchanged.

2. **Zero-config peer discovery** — Once nodes know each other's keys, the mesh self-heals. We tested killing and restarting nodes; re-routing happened within seconds.

3. **Small binary, fast startup** — The compiled `node.exe` (17MB) starts in <1s and uses ~20MB RAM per node. Running 4 nodes on a single machine was trivial.

4. **Topology API** — `GET /api/topology` returning all connected peers made our frontend network graph visualization possible with no custom code.

5. **Go build reliability** — Once we pinned the toolchain, the build was perfectly reproducible across machines.

---

## Pain Points & Suggestions

### 1. Go Version Sensitivity (HIGH FRICTION)

**Problem:** AXL requires Go 1.26.2 but the internal gVisor dependency (`inet.af/netstack`) needs `GOTOOLCHAIN=go1.25.5`. Building with the default toolchain fails with cryptic errors about missing symbols.

**Reproduction:**
```bash
$ go build ./cmd/node
# inet.af/netstack/tcpip
..\..\go\pkg\mod\inet.af\netstack@v0.0.0-20211120054903-b2e19a65cfe8\tcpip\timer.go:74:5: t.locker.Lock undefined
```

**Fix we applied:**
```bash
export GOTOOLCHAIN=go1.25.5
```

**Suggestion:** Pin `GOTOOLCHAIN` in `go.mod` or add a build wrapper script. This cost us ~2 hours of debugging. A `.go-version` file or explicit `toolchain go1.25.5` directive in go.mod would prevent this for every builder.

---

### 2. No JavaScript/TypeScript SDK

**Problem:** Our entire stack is TypeScript (Bun + Next.js). Interacting with AXL required raw `fetch()` calls to HTTP endpoints. There's no `@gensyn/axl-client` npm package.

**What we had to do:**
```typescript
// Every AXL call is a manual fetch with JSON-RPC body
const response = await fetch(`http://127.0.0.1:${axlPort}/mcp/${peerKey}/${service}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", id: 1, params: { name, arguments: args } }),
});
```

**Suggestion:** A thin TypeScript client (`axl-client`) with typed methods would dramatically lower integration friction for JS/TS hackathon projects. Even a 50-line wrapper with proper types would help.

---

### 3. MCP Error Propagation

**Problem:** When a downstream MCP service returns an error, AXL wraps it in its own error structure. The original error message/code from the tool provider gets obscured.

**Example:** Tool returns `{ "error": { "code": -32602, "message": "Missing required param: token" } }` but through AXL we get a generic connection error.

**Suggestion:** Preserve the original JSON-RPC error envelope when proxying MCP responses. This would make debugging much faster.

---

### 4. Node Configuration Documentation

**Problem:** The `node-config.json` schema isn't fully documented. We discovered fields like `tcp_port`, `mcp_services`, and `yggdrasil` through trial and error and reading Go source.

**Suggestion:** A JSON Schema file or a `--generate-config` CLI flag that outputs a commented template would save significant setup time.

---

### 5. No Hot-Reload for MCP Service Registration

**Problem:** Adding a new MCP service to a running node requires restart. During development, this meant stopping all 4 nodes, editing configs, and restarting.

**Suggestion:** A runtime API endpoint like `POST /api/services/register` would enable dynamic tool registration — which is critical for marketplace-style architectures like ours where tools come and go.

---

## What We'd Use Next

If continuing development post-hackathon:

- **Dynamic peer discovery** — DHT-based instead of config-file key lists
- **Encrypted payloads** — End-to-end encryption for MCP messages (beyond transport)
- **Bandwidth metering** — Track data volume per peer for billing
- **WebSocket transport option** — For browser-based nodes

---

## Summary

AXL is the most practical P2P networking layer we've seen for agent communication. The MCP routing is a perfect fit. The main friction is ecosystem maturity — a JS SDK, better error propagation, and documented config would make it accessible to the 80% of hackathon teams using TypeScript.

**Overall rating: 8/10** — Great technology, minor DX friction.
