"use client";

import { useReadContract, useReadContracts } from "wagmi";
import {
  REGISTRY_ADDRESS,
  REGISTRY_ABI,
  REPUTATION_ADDRESS,
  REPUTATION_ABI,
  ZG_CHAIN_ID,
} from "@/config/contracts";

export interface OnChainAgent {
  id: `0x${string}`;
  owner: string;
  ensName: string;
  axlPeerKey: string;
  capabilities: string[];
  pricePerCall: bigint;
  registeredAt: bigint;
  active: boolean;
  reputation?: {
    tasksCompleted: bigint;
    tasksFailed: bigint;
    totalResponseTime: bigint;
    totalEarned: bigint;
    lastUpdated: bigint;
    successRate: number;
  };
}

export function useAgentCount() {
  return useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getAgentCount",
    chainId: ZG_CHAIN_ID,
  });
}

export function useAllAgentIds() {
  return useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getAllAgentIds",
    chainId: ZG_CHAIN_ID,
  });
}

export function useAgentDetails(agentId: `0x${string}` | undefined) {
  return useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getAgent",
    args: agentId ? [agentId] : undefined,
    chainId: ZG_CHAIN_ID,
    query: { enabled: !!agentId },
  });
}

export function useAgentReputation(agentId: `0x${string}` | undefined) {
  return useReadContract({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: "getReputation",
    args: agentId ? [agentId] : undefined,
    chainId: ZG_CHAIN_ID,
    query: { enabled: !!agentId },
  });
}

export function useRegistryAgents() {
  const { data: agentIds, isLoading: idsLoading } = useAllAgentIds();

  const agentCalls = (agentIds ?? []).map((id) => ({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getAgent" as const,
    args: [id] as const,
    chainId: ZG_CHAIN_ID,
  }));

  const repCalls = (agentIds ?? []).map((id) => ({
    address: REPUTATION_ADDRESS,
    abi: REPUTATION_ABI,
    functionName: "getReputation" as const,
    args: [id] as const,
    chainId: ZG_CHAIN_ID,
  }));

  const { data: agentResults, isLoading: agentsLoading } = useReadContracts({
    contracts: agentCalls,
    query: { enabled: !!agentIds && agentIds.length > 0 },
  });

  const { data: repResults, isLoading: repLoading } = useReadContracts({
    contracts: repCalls,
    query: { enabled: !!agentIds && agentIds.length > 0 },
  });

  const agents: OnChainAgent[] = [];

  if (agentIds && agentResults) {
    for (let i = 0; i < agentIds.length; i++) {
      const agentResult = agentResults[i];
      if (agentResult?.status !== "success") continue;

      const [
        owner,
        ensName,
        axlPeerKey,
        capabilities,
        pricePerCall,
        registeredAt,
        active,
      ] = agentResult.result as [
        string,
        string,
        string,
        string[],
        bigint,
        bigint,
        boolean,
      ];

      if (!active) continue;

      let reputation: OnChainAgent["reputation"];
      if (repResults?.[i]?.status === "success") {
        const [
          tasksCompleted,
          tasksFailed,
          totalResponseTime,
          totalEarned,
          lastUpdated,
        ] = repResults[i].result as [bigint, bigint, bigint, bigint, bigint];
        const total = Number(tasksCompleted) + Number(tasksFailed);
        const successRate =
          total > 0 ? (Number(tasksCompleted) * 100) / total : 0;
        reputation = {
          tasksCompleted,
          tasksFailed,
          totalResponseTime,
          totalEarned,
          lastUpdated,
          successRate,
        };
      }

      agents.push({
        id: agentIds[i],
        owner,
        ensName,
        axlPeerKey,
        capabilities,
        pricePerCall,
        registeredAt,
        active,
        reputation,
      });
    }
  }

  return {
    agents,
    isLoading: idsLoading || agentsLoading || repLoading,
  };
}
