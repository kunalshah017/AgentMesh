# AXL Node Setup

## Prerequisites
- Go 1.25.5 (NOT 1.26 — gvisor compat issue)
- Set `GOTOOLCHAIN=go1.25.5`

## Build AXL Binary
```bash
git clone https://github.com/gensyn-ai/axl
cd axl
GOTOOLCHAIN=go1.25.5 make build
```

## Generate Keys
```bash
mkdir -p keys
openssl genpkey -algorithm ed25519 -out keys/orchestrator.pem
openssl genpkey -algorithm ed25519 -out keys/researcher.pem
openssl genpkey -algorithm ed25519 -out keys/risk-analyst.pem
openssl genpkey -algorithm ed25519 -out keys/executor.pem
```

## Start Nodes
```bash
# Terminal 1 — Orchestrator
./axl/node -config configs/orchestrator.json

# Terminal 2 — Researcher
./axl/node -config configs/researcher.json

# Terminal 3 — Risk Analyst
./axl/node -config configs/risk-analyst.json

# Terminal 4 — Executor
./axl/node -config configs/executor.json
```

## Start MCP Routers
Each node needs its MCP router running (from axl/integrations):
```bash
python -m mcp_routing.mcp_router --port 9003  # Orchestrator
python -m mcp_routing.mcp_router --port 9013  # Researcher
python -m mcp_routing.mcp_router --port 9023  # Risk Analyst
python -m mcp_routing.mcp_router --port 9033  # Executor
```

## Peer Discovery
After all nodes are running, note each node's public key from startup logs.
Update the `bootstrap_peers` in each config to include the other nodes.
