import { z } from "zod";

// --- Agent Identity ---
export interface AgentIdentity {
  name: string;
  ensName: string; // e.g. "researcher.agentmesh.eth"
  axlPeerKey: string;
  endpoint?: string; // HTTP/MCP endpoint URL for external tool calling
  capabilities: string[];
}

// --- Discovered Tool (from tools/list on external MCP servers) ---
export interface DiscoveredTool {
  name: string; // Tool name as returned by tools/list
  description: string; // Human-readable description
  inputSchema?: Record<string, unknown>; // JSON Schema for arguments
  providerName: string; // Provider ENS name (e.g. "gas-tools.agent-mesh.eth")
  providerEndpoint: string; // Provider's MCP endpoint URL
}

// --- Catalog Provider (provider + its discovered tools, for frontend consumption) ---
export interface CatalogProvider {
  name: string; // Provider display name
  ensName: string; // ENS subname (e.g. "gas-tools.agent-mesh.eth")
  endpoint: string; // MCP endpoint URL
  categories: string[]; // Categories/capabilities from registration
  tools: DiscoveredTool[]; // Individual tools discovered via tools/list
  status: "online" | "offline" | "degraded"; // Live health status
  registeredAt?: number; // Unix timestamp of on-chain registration
  owner?: string; // Provider owner address
}

// --- Catalog Response (what /catalog returns to the frontend) ---
export interface CatalogResponse {
  providers: CatalogProvider[];
  tools: DiscoveredTool[];
  lastRefreshed: number;
}

// --- MCP Types ---
export interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  id: number | string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
}

// --- Task Types ---
export type TaskStatus = "pending" | "in-progress" | "completed" | "failed";

export interface Task {
  id: string;
  goal: string;
  status: TaskStatus;
  subtasks: SubTask[];
  createdAt: number;
  completedAt?: number;
}

export interface SubTask {
  id: string;
  parentId: string;
  description: string;
  assignedTool: string; // ENS name of tool provider
  status: TaskStatus;
  result?: unknown;
  payment?: PaymentRecord;
}

// --- Payment Types ---
export interface PaymentRecord {
  txHash: string;
  amount: string; // USDC
  from: string; // address
  to: string; // address
  timestamp: number;
}

// --- Reputation ---
export interface ReputationScore {
  agent: string; // ENS name
  tasksCompleted: number;
  successRate: number; // 0-100
  avgResponseTime: number; // ms
  totalEarned: string; // USDC
}

// --- Events (for dashboard SSE) ---
export type AgentEvent =
  | { type: "task_created"; task: Task }
  | { type: "tool_discovered"; tool: AgentIdentity }
  | { type: "tool_called"; tool: string; method: string }
  | { type: "payment_sent"; payment: PaymentRecord }
  | {
      type: "payment_request";
      toolName: string;
      amount: string;
      recipient: string;
    }
  | { type: "task_completed"; taskId: string; result: unknown }
  | { type: "error"; message: string };

// --- Zod Schemas for validation ---
export const AgentIdentitySchema = z.object({
  name: z.string(),
  ensName: z.string(),
  axlPeerKey: z.string(),
  capabilities: z.array(z.string()),
});

export const MCPRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  id: z.union([z.number(), z.string()]),
  params: z.record(z.unknown()).optional(),
});
