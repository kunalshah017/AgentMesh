// ToolCatalog — Discovers and caches individual tools from registered MCP providers
// Calls tools/list on each provider's endpoint to build a unified tool catalog

import type {
  AgentIdentity,
  DiscoveredTool,
  CatalogProvider,
  CatalogResponse,
} from "@agentmesh/shared";

/**
 * MCP tools/list response format
 */
interface MCPToolsListResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: {
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;
  };
  error?: { code: number; message: string };
}

/**
 * ToolCatalog maintains a map of tool names to their provider info.
 * Populated by calling tools/list on each registered external provider.
 */
export class ToolCatalog {
  private tools: Map<string, DiscoveredTool> = new Map();
  private providerTools: Map<string, DiscoveredTool[]> = new Map();
  private providerStatus: Map<string, "online" | "offline" | "degraded"> =
    new Map();
  private providerMeta: Map<string, AgentIdentity> = new Map();
  private lastRefresh: number = 0;

  /**
   * Get all discovered tools.
   */
  getAllTools(): DiscoveredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Find a tool by exact name.
   */
  getTool(name: string): DiscoveredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Find tools matching a keyword/capability.
   */
  findTools(query: string): DiscoveredTool[] {
    const q = query.toLowerCase();
    return Array.from(this.tools.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }

  /**
   * Get all tools for a specific provider.
   */
  getProviderTools(providerEnsName: string): DiscoveredTool[] {
    return this.providerTools.get(providerEnsName) ?? [];
  }

  /**
   * Discover tools from all registered providers that have HTTP endpoints.
   * Calls tools/list on each endpoint and caches the results.
   */
  async discoverFromProviders(providers: AgentIdentity[]): Promise<void> {
    const externalProviders = providers.filter(
      (p) => p.endpoint && p.endpoint.startsWith("http"),
    );

    // Store provider metadata for catalog response
    for (const provider of providers) {
      this.providerMeta.set(provider.ensName, provider);
    }

    const results = await Promise.allSettled(
      externalProviders.map((provider) => this.discoverFromProvider(provider)),
    );

    let discovered = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        discovered += result.value;
      }
    }

    // Also register local-only providers (no endpoint) as offline in catalog
    const localProviders = providers.filter(
      (p) => !p.endpoint || !p.endpoint.startsWith("http"),
    );
    for (const provider of localProviders) {
      if (!this.providerStatus.has(provider.ensName)) {
        this.providerStatus.set(provider.ensName, "offline");
      }
    }

    if (discovered > 0) {
      console.log(
        `   🔍 ToolCatalog: Discovered ${discovered} tools from ${externalProviders.length} providers`,
      );
    }
    this.lastRefresh = Date.now();
  }

  /**
   * Call tools/list on a single provider and add results to catalog.
   */
  private async discoverFromProvider(provider: AgentIdentity): Promise<number> {
    if (!provider.endpoint) return 0;

    try {
      const response = await fetch(provider.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/list",
          id: 1,
          params: {},
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout per provider
      });

      if (!response.ok) {
        // Provider might not support tools/list — use capabilities as fallback
        this.providerStatus.set(provider.ensName, "degraded");
        this.registerFallbackTools(provider);
        return provider.capabilities.length;
      }

      const data = (await response.json()) as MCPToolsListResponse;
      if (data.error || !data.result?.tools) {
        this.providerStatus.set(provider.ensName, "degraded");
        this.registerFallbackTools(provider);
        return provider.capabilities.length;
      }

      this.providerStatus.set(provider.ensName, "online");
      const providerToolList: DiscoveredTool[] = [];
      for (const tool of data.result.tools) {
        const discovered: DiscoveredTool = {
          name: tool.name,
          description: tool.description ?? tool.name,
          inputSchema: tool.inputSchema,
          providerName: provider.ensName,
          providerEndpoint: provider.endpoint,
        };
        this.tools.set(tool.name, discovered);
        providerToolList.push(discovered);
      }
      this.providerTools.set(provider.ensName, providerToolList);
      return providerToolList.length;
    } catch {
      // Network error — register fallback tools from capabilities
      this.providerStatus.set(provider.ensName, "offline");
      this.registerFallbackTools(provider);
      return provider.capabilities.length;
    }
  }

  /**
   * When tools/list fails, use the provider's registered capabilities as tool names.
   */
  private registerFallbackTools(provider: AgentIdentity): void {
    if (!provider.endpoint) return;
    const providerToolList: DiscoveredTool[] = [];
    for (const cap of provider.capabilities) {
      const discovered: DiscoveredTool = {
        name: cap,
        description: `${cap} (from ${provider.name})`,
        providerName: provider.ensName,
        providerEndpoint: provider.endpoint,
      };
      this.tools.set(cap, discovered);
      providerToolList.push(discovered);
    }
    this.providerTools.set(provider.ensName, providerToolList);
  }

  /**
   * Register built-in/local tools (so the planner sees them alongside external ones).
   */
  registerLocalTools(
    tools: Array<{ name: string; description: string }>,
  ): void {
    for (const tool of tools) {
      const discovered: DiscoveredTool = {
        name: tool.name,
        description: tool.description,
        providerName: "local",
        providerEndpoint: "",
      };
      this.tools.set(tool.name, discovered);
    }
  }

  /**
   * Register a built-in provider with its tools (always present in catalog).
   */
  registerBuiltinProvider(provider: {
    name: string;
    ensName: string;
    endpoint: string;
    categories: string[];
    tools: Array<{
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      keywords?: string[];
      example?: string;
    }>;
  }): void {
    const providerToolList: DiscoveredTool[] = provider.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      providerName: provider.ensName,
      providerEndpoint: provider.endpoint,
      keywords: t.keywords,
      example: t.example,
    }));

    for (const tool of providerToolList) {
      this.tools.set(tool.name, tool);
    }
    this.providerTools.set(provider.ensName, providerToolList);
    this.providerStatus.set(provider.ensName, "online");
    this.providerMeta.set(provider.ensName, {
      name: provider.name,
      ensName: provider.ensName,
      axlPeerKey: "",
      endpoint: provider.endpoint,
      capabilities: provider.categories,
    });
    this.lastRefresh = Date.now();
  }

  /**
   * Get a summary of all tools for the LLM planner.
   */
  getToolSummaryForPlanner(): string {
    const tools = this.getAllTools();
    if (tools.length === 0) {
      return "No tools available.";
    }

    // Tool list with descriptions
    const toolList = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    // Auto-generate keyword guide from tool metadata
    const toolsWithKeywords = tools.filter(
      (t) => t.keywords && t.keywords.length > 0,
    );
    const keywordGuide =
      toolsWithKeywords.length > 0
        ? "\n\nTOOL SELECTION GUIDE:\n" +
          toolsWithKeywords
            .map((t) => `- ${t.keywords!.join(", ")} → "${t.name}"`)
            .join("\n")
        : "";

    // Auto-generate examples from tool metadata
    const toolsWithExamples = tools.filter((t) => t.example);
    const examples =
      toolsWithExamples.length > 0
        ? "\n\nEXAMPLES:\n" +
          toolsWithExamples.map((t) => `- ${t.example}`).join("\n")
        : "";

    return toolList + keywordGuide + examples;
  }

  /**
   * Get structured catalog response for the frontend API.
   * Groups tools by provider with health status.
   */
  getCatalogResponse(): CatalogResponse {
    const providers: CatalogProvider[] = [];

    for (const [ensName, tools] of this.providerTools.entries()) {
      const meta = this.providerMeta.get(ensName);
      const status = this.providerStatus.get(ensName) ?? "offline";

      providers.push({
        name: meta?.name ?? ensName.split(".")[0] ?? ensName,
        ensName,
        endpoint: meta?.endpoint ?? tools[0]?.providerEndpoint ?? "",
        categories: meta?.capabilities ?? [],
        tools,
        status,
        owner: undefined, // Populated by caller from on-chain data
      });
    }

    return {
      providers,
      tools: this.getAllTools(),
      lastRefreshed: this.lastRefresh,
    };
  }
}
