import { parseAbi } from "viem";

export const REGISTRY_ADDRESS =
  "0x632B1282B766fb811b3570274A86A4E83838cbDd" as const;
export const REPUTATION_ADDRESS =
  "0xf59Bf05D823b01F8E65a1AfFf718Fe5437D2DA10" as const;

export const REGISTRY_ABI = parseAbi([
  "function getAgentCount() external view returns (uint256)",
  "function getAllAgentIds() external view returns (bytes32[])",
  "function getAgent(bytes32 id) external view returns (address owner, string ensName, string endpoint, string[] categories, uint256 registeredAt, bool active)",
  "function getCapabilities(bytes32 id) external view returns (string[])",
  "function registerAgent(string ensName, string endpoint, string[] categories) external returns (bytes32)",
  "function updateEndpoint(bytes32 id, string endpoint) external",
  "function updateCategories(bytes32 id, string[] categories) external",
]);

export const REPUTATION_ABI = parseAbi([
  "function getReputation(bytes32 agentId) external view returns (uint256 tasksCompleted, uint256 tasksFailed, uint256 totalResponseTime, uint256 totalEarned, uint256 lastUpdated)",
  "function getSuccessRate(bytes32 agentId) external view returns (uint256)",
  "function getAvgResponseTime(bytes32 agentId) external view returns (uint256)",
  "function recordTask(bytes32 agentId, bool success, uint256 responseTimeMs, uint256 earnedUsdc) external",
]);

// 0G Chain Testnet
export const ZG_CHAIN_ID = 16602;
