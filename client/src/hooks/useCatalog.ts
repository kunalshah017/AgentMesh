"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface CatalogTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  providerName: string;
  providerEndpoint: string;
}

export interface CatalogProvider {
  name: string;
  ensName: string;
  endpoint: string;
  categories: string[];
  tools: CatalogTool[];
  status: "online" | "offline" | "degraded";
  registeredAt?: number;
  owner?: string;
}

export interface CatalogData {
  providers: CatalogProvider[];
  tools: CatalogTool[];
  lastRefreshed: number;
}

// Fallback data when orchestrator is unavailable
const FALLBACK_CATALOG: CatalogData = {
  providers: [
    {
      name: "AgentMesh",
      ensName: "agent-mesh.eth",
      endpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
      categories: [
        "defi-research",
        "yield-scanning",
        "token-analysis",
        "risk-analysis",
        "contract-auditing",
        "execution",
        "token-swaps",
        "gas-prediction",
      ],
      tools: [
        {
          name: "scan-yields",
          description: "Scan DeFi protocols for yield opportunities",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "token-info",
          description: "Get token price and market data from CoinGecko",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "protocol-stats",
          description: "Get protocol TVL and statistics from DeFi Llama",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "risk-assess",
          description: "Assess risk of a DeFi protocol",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "contract-audit",
          description: "Check smart contract audit status",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "execute-swap",
          description: "Execute a token swap via Uniswap (live quotes)",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "execute-deposit",
          description: "Deposit tokens into a DeFi protocol",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "check-balance",
          description: "Check wallet token balances on-chain",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
        {
          name: "pay-with-any-token",
          description: "Auto-swap any token to USDC for x402 payment",
          providerName: "agent-mesh.eth",
          providerEndpoint: "https://agent-mesh-orchestrator.onrender.com/mcp",
        },
      ],
      status: "online",
    },
  ],
  tools: [],
  lastRefreshed: Date.now(),
};
// Flatten fallback tools
FALLBACK_CATALOG.tools = FALLBACK_CATALOG.providers.flatMap((p) => p.tools);

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogData>(FALLBACK_CATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    const url =
      API_URL ||
      (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : "");
    if (!url) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${url}/catalog`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Handle both old format (array of tools) and new format (CatalogResponse)
      if (Array.isArray(data)) {
        // Legacy: array of DiscoveredTool — group by provider
        const byProvider = new Map<string, CatalogTool[]>();
        for (const tool of data) {
          const existing = byProvider.get(tool.providerName) ?? [];
          existing.push(tool);
          byProvider.set(tool.providerName, existing);
        }
        const providers: CatalogProvider[] = Array.from(
          byProvider.entries(),
        ).map(([ensName, tools]) => ({
          name: ensName.split(".")[0] ?? ensName,
          ensName,
          endpoint: tools[0]?.providerEndpoint ?? "",
          categories: [...new Set(tools.map((t) => t.name))],
          tools,
          status: "online" as const,
        }));
        setCatalog({ providers, tools: data, lastRefreshed: Date.now() });
      } else if (data.providers) {
        // New format: CatalogResponse
        setCatalog(data);
      }
    } catch (err) {
      setError(String(err));
      // Keep fallback data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    catalog,
    providers: catalog.providers,
    tools: catalog.tools,
    isLoading,
    error,
    refresh: fetchCatalog,
  };
}
