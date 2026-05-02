// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry (v2 — Provider-Level)
 * @notice Registry for MCP server providers in the AgentMesh network.
 *         Each provider registers once with their endpoint URL.
 *         Individual tools are discovered at runtime via MCP tools/list.
 *         Pricing is handled via x402 protocol (HTTP 402 responses).
 * @dev Deployed on 0G Chain testnet.
 */
contract AgentRegistry {
    struct Agent {
        address owner;
        string ensName;       // ENS subname (e.g. "researcher.agent-mesh.eth")
        string endpoint;      // MCP server endpoint URL (was axlPeerKey)
        string[] categories;  // Provider categories (was capabilities)
        uint256 registeredAt;
        bool active;
    }

    mapping(bytes32 => Agent) public agents; // keccak256(ensName) => Agent
    bytes32[] public agentIds;

    event AgentRegistered(bytes32 indexed id, string ensName, address owner, string endpoint);
    event AgentUpdated(bytes32 indexed id, string ensName);
    event AgentDeactivated(bytes32 indexed id, string ensName);
    event AgentReactivated(bytes32 indexed id, string ensName);

    modifier onlyAgentOwner(bytes32 id) {
        require(agents[id].owner == msg.sender, "Not agent owner");
        _;
    }

    /**
     * @notice Register a new MCP server provider.
     * @param ensName ENS subname for this provider
     * @param endpoint MCP server endpoint URL
     * @param categories Provider categories for discovery
     */
    function registerAgent(
        string calldata ensName,
        string calldata endpoint,
        string[] calldata categories
    ) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(ensName));
        require(agents[id].owner == address(0), "Agent already registered");

        agents[id] = Agent({
            owner: msg.sender,
            ensName: ensName,
            endpoint: endpoint,
            categories: categories,
            registeredAt: block.timestamp,
            active: true
        });

        agentIds.push(id);
        emit AgentRegistered(id, ensName, msg.sender, endpoint);
        return id;
    }

    /**
     * @notice Update provider's endpoint URL.
     */
    function updateEndpoint(
        bytes32 id,
        string calldata endpoint
    ) external onlyAgentOwner(id) {
        agents[id].endpoint = endpoint;
        emit AgentUpdated(id, agents[id].ensName);
    }

    /**
     * @notice Update provider's categories.
     */
    function updateCategories(
        bytes32 id,
        string[] calldata categories
    ) external onlyAgentOwner(id) {
        agents[id].categories = categories;
        emit AgentUpdated(id, agents[id].ensName);
    }

    /**
     * @notice Deactivate a provider (soft delete).
     */
    function deactivateAgent(bytes32 id) external onlyAgentOwner(id) {
        agents[id].active = false;
        emit AgentDeactivated(id, agents[id].ensName);
    }

    /**
     * @notice Reactivate a previously deactivated provider.
     */
    function reactivateAgent(bytes32 id) external onlyAgentOwner(id) {
        require(!agents[id].active, "Already active");
        agents[id].active = true;
        emit AgentReactivated(id, agents[id].ensName);
    }

    /**
     * @notice Get total number of registered providers.
     */
    function getAgentCount() external view returns (uint256) {
        return agentIds.length;
    }

    /**
     * @notice Get provider categories by ID.
     */
    function getCapabilities(bytes32 id) external view returns (string[] memory) {
        return agents[id].categories;
    }

    /**
     * @notice Get full provider data by ID.
     */
    function getAgent(bytes32 id) external view returns (
        address owner,
        string memory ensName,
        string memory endpoint,
        string[] memory categories,
        uint256 registeredAt,
        bool active
    ) {
        Agent storage a = agents[id];
        return (a.owner, a.ensName, a.endpoint, a.categories, a.registeredAt, a.active);
    }

    /**
     * @notice Get all registered provider IDs.
     */
    function getAllAgentIds() external view returns (bytes32[] memory) {
        return agentIds;
    }
}
