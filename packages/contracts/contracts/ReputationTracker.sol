// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationTracker
 * @notice Tracks reputation scores for agents in the AgentMesh network.
 *         Updated after each successful/failed task completion.
 * @dev Deployed on 0G Chain testnet.
 */
contract ReputationTracker {
    struct Reputation {
        uint256 tasksCompleted;
        uint256 tasksFailed;
        uint256 totalResponseTime; // cumulative ms
        uint256 totalEarned; // cumulative USDC (6 decimals)
        uint256 lastUpdated;
    }

    mapping(bytes32 => Reputation) public reputations; // agentId => Reputation

    event ReputationUpdated(
        bytes32 indexed agentId,
        bool success,
        uint256 responseTime,
        uint256 earned
    );

    /**
     * @notice Record a completed task for an agent.
     */
    function recordTask(
        bytes32 agentId,
        bool success,
        uint256 responseTimeMs,
        uint256 earnedUsdc
    ) external {
        Reputation storage rep = reputations[agentId];

        if (success) {
            rep.tasksCompleted++;
        } else {
            rep.tasksFailed++;
        }

        rep.totalResponseTime += responseTimeMs;
        rep.totalEarned += earnedUsdc;
        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(agentId, success, responseTimeMs, earnedUsdc);
    }

    /**
     * @notice Get success rate (0-100) for an agent.
     */
    function getSuccessRate(bytes32 agentId) external view returns (uint256) {
        Reputation memory rep = reputations[agentId];
        uint256 total = rep.tasksCompleted + rep.tasksFailed;
        if (total == 0) return 0;
        return (rep.tasksCompleted * 100) / total;
    }

    /**
     * @notice Get average response time in ms.
     */
    function getAvgResponseTime(bytes32 agentId) external view returns (uint256) {
        Reputation memory rep = reputations[agentId];
        uint256 total = rep.tasksCompleted + rep.tasksFailed;
        if (total == 0) return 0;
        return rep.totalResponseTime / total;
    }

    /**
     * @notice Get full reputation data for an agent.
     */
    function getReputation(bytes32 agentId) external view returns (
        uint256 tasksCompleted,
        uint256 tasksFailed,
        uint256 totalResponseTime,
        uint256 totalEarned,
        uint256 lastUpdated
    ) {
        Reputation memory rep = reputations[agentId];
        return (rep.tasksCompleted, rep.tasksFailed, rep.totalResponseTime, rep.totalEarned, rep.lastUpdated);
    }
}
