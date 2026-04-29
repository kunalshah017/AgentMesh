#!/usr/bin/env bash
# Start the full AgentMesh P2P network
# Usage: ./start-mesh.sh

set -e
cd "$(dirname "$0")"

echo "🌐 Starting AgentMesh P2P Network..."

# Start orchestrator node (hub)
echo "  Starting orchestrator node (port 9002)..."
./node.exe -config configs/orchestrator.json &
ORCH_PID=$!
sleep 2

# Start peer nodes
echo "  Starting researcher node (port 9012)..."
./node.exe -config configs/researcher.json &
RESEARCHER_PID=$!

echo "  Starting analyst node (port 9022)..."
./node.exe -config configs/analyst.json &
ANALYST_PID=$!

echo "  Starting executor node (port 9032)..."
./node.exe -config configs/executor.json &
EXECUTOR_PID=$!

sleep 2

# Start MCP routers
echo "  Starting MCP routers..."
cd integrations
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate

python -m mcp_routing.mcp_router --port 9003 &
ROUTER_ORCH_PID=$!
python -m mcp_routing.mcp_router --port 9013 &
ROUTER_RES_PID=$!
python -m mcp_routing.mcp_router --port 9023 &
ROUTER_ANA_PID=$!
python -m mcp_routing.mcp_router --port 9033 &
ROUTER_EXE_PID=$!

sleep 1
cd ..

# Register services with each router
echo "  Registering services..."

# Researcher services
curl -s -X POST http://127.0.0.1:9013/register \
  -H "Content-Type: application/json" \
  -d '{"service": "defi-research", "endpoint": "http://127.0.0.1:3002/mcp"}' > /dev/null

# Analyst services
curl -s -X POST http://127.0.0.1:9023/register \
  -H "Content-Type: application/json" \
  -d '{"service": "risk-analysis", "endpoint": "http://127.0.0.1:3003/mcp"}' > /dev/null

# Executor services
curl -s -X POST http://127.0.0.1:9033/register \
  -H "Content-Type: application/json" \
  -d '{"service": "execution", "endpoint": "http://127.0.0.1:3004/mcp"}' > /dev/null

echo ""
echo "✅ AgentMesh P2P Network Running!"
echo ""
echo "  Orchestrator:  http://127.0.0.1:9002  (API)"
echo "  Researcher:    http://127.0.0.1:9012  (peer: 85bae0a7...)"
echo "  Analyst:       http://127.0.0.1:9022  (peer: f2d4eea2...)"
echo "  Executor:      http://127.0.0.1:9032  (peer: 60bb86f0...)"
echo ""
echo "  MCP Routers: 9003, 9013, 9023, 9033"
echo ""
echo "Press Ctrl+C to stop all nodes..."

# Trap to clean up
cleanup() {
  echo "Stopping all nodes..."
  kill $ORCH_PID $RESEARCHER_PID $ANALYST_PID $EXECUTOR_PID 2>/dev/null
  kill $ROUTER_ORCH_PID $ROUTER_RES_PID $ROUTER_ANA_PID $ROUTER_EXE_PID 2>/dev/null
  wait
}
trap cleanup EXIT INT TERM

wait
