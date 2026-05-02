import { parseAbi } from "viem";

export const REGISTRY_ADDRESS =
  "0x0B05236c972DbFCe91519a183980F0D5fFd9da28" as const;
export const REPUTATION_ADDRESS =
  "0x2B8C2D313300122e0Fd90a3B7F4e3f0Bb05E2Cf4" as const;

export const REGISTRY_ABI = parseAbi([
  "function getAgentCount() external view returns (uint256)",
  "function getAllAgentIds() external view returns (bytes32[])",
  "function getAgent(bytes32 id) external view returns (address owner, string ensName, string axlPeerKey, string[] capabilities, uint256 pricePerCall, uint256 registeredAt, bool active)",
  "function getCapabilities(bytes32 id) external view returns (string[])",
  "function registerAgent(string ensName, string axlPeerKey, string[] capabilities, uint256 pricePerCall) external returns (bytes32)",
]);

export const REPUTATION_ABI = parseAbi([
  "function getReputation(bytes32 agentId) external view returns (uint256 tasksCompleted, uint256 tasksFailed, uint256 totalResponseTime, uint256 totalEarned, uint256 lastUpdated)",
  "function getSuccessRate(bytes32 agentId) external view returns (uint256)",
  "function getAvgResponseTime(bytes32 agentId) external view returns (uint256)",
  "function recordTask(bytes32 agentId, bool success, uint256 responseTimeMs, uint256 earnedUsdc) external",
]);

// 0G Chain Testnet
export const ZG_CHAIN_ID = 16602;
