// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice Registry for AI tool providers in the AgentMesh network.
 *         Stores agent metadata, capabilities, and pricing on-chain.
 * @dev Deployed on 0G Chain testnet.
 */
contract AgentRegistry {
    struct Agent {
        address owner;
        string ensName;
        string axlPeerKey;
        string[] capabilities;
        uint256 pricePerCall; // in wei (USDC decimals)
        uint256 registeredAt;
        bool active;
    }

    mapping(bytes32 => Agent) public agents; // keccak256(ensName) => Agent
    bytes32[] public agentIds;

    event AgentRegistered(bytes32 indexed id, string ensName, address owner);
    event AgentUpdated(bytes32 indexed id, string ensName);
    event AgentDeactivated(bytes32 indexed id, string ensName);

    modifier onlyAgentOwner(bytes32 id) {
        require(agents[id].owner == msg.sender, "Not agent owner");
        _;
    }

    /**
     * @notice Register a new tool provider agent.
     */
    function registerAgent(
        string calldata ensName,
        string calldata axlPeerKey,
        string[] calldata capabilities,
        uint256 pricePerCall
    ) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(ensName));
        require(agents[id].owner == address(0), "Agent already registered");

        agents[id] = Agent({
            owner: msg.sender,
            ensName: ensName,
            axlPeerKey: axlPeerKey,
            capabilities: capabilities,
            pricePerCall: pricePerCall,
            registeredAt: block.timestamp,
            active: true
        });

        agentIds.push(id);
        emit AgentRegistered(id, ensName, msg.sender);
        return id;
    }

    /**
     * @notice Update agent's AXL peer key and pricing.
     */
    function updateAgent(
        bytes32 id,
        string calldata axlPeerKey,
        uint256 pricePerCall
    ) external onlyAgentOwner(id) {
        agents[id].axlPeerKey = axlPeerKey;
        agents[id].pricePerCall = pricePerCall;
        emit AgentUpdated(id, agents[id].ensName);
    }

    /**
     * @notice Deactivate an agent (soft delete).
     */
    function deactivateAgent(bytes32 id) external onlyAgentOwner(id) {
        agents[id].active = false;
        emit AgentDeactivated(id, agents[id].ensName);
    }

    /**
     * @notice Get total number of registered agents.
     */
    function getAgentCount() external view returns (uint256) {
        return agentIds.length;
    }

    /**
     * @notice Get agent capabilities by ID.
     */
    function getCapabilities(bytes32 id) external view returns (string[] memory) {
        return agents[id].capabilities;
    }
}
