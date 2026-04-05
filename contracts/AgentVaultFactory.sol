// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentVault.sol";
import "./interfaces/ITradeJournal.sol";
import "./interfaces/IReputationRegistry.sol";

contract AgentVaultFactory {

    // ── Events ────────────────────────────────────────────────
    event VaultCreated(
        address indexed user,
        address indexed agent,
        address vault,
        uint256 timestamp
    );

    // ── Storage ───────────────────────────────────────────────
    address public owner;
    address public settlementToken;
    address public reputationRegistry;
    address public tradeJournal;

    // user wallet => their vault address
    mapping(address => address) public userVault;

    // agent address => their vault address
    mapping(address => address) public agentVault;

    // all vaults ever created
    address[] public allVaults;

    // ── Modifier ──────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address _settlementToken,
        address _reputationRegistry,
        address _tradeJournal
    ) {
        owner               = msg.sender;
        settlementToken     = _settlementToken;
        reputationRegistry  = _reputationRegistry;
        tradeJournal        = _tradeJournal;
    }

    // ── Core: create a vault for a user ──────────────────────
    function createVault(
        address agentAddress,       // the agent wallet that will trade
        uint256 maxDrawdownBps,     // e.g. 1000 = 10%
        uint256 maxPositionSizeBps, // e.g. 200 = 2%
        uint256 maxDailySpendUSDC,  // e.g. 100 * 1e6 = $100
        uint256 cooldownSeconds     // e.g. 3600 = 1 hour
    ) external returns (address vault) {
        require(userVault[msg.sender] == address(0), "Vault already exists");
        require(agentAddress != address(0), "Invalid agent address");
        require(agentVault[agentAddress] == address(0), "Agent already has vault");

        // Deploy a new AgentVault for this user
        AgentVault newVault = new AgentVault(
            settlementToken,
            reputationRegistry,
            agentAddress,
            maxDrawdownBps,
            maxPositionSizeBps,
            maxDailySpendUSDC,
            cooldownSeconds
        );

        vault = address(newVault);

        // Register mappings
        userVault[msg.sender]    = vault;
        agentVault[agentAddress] = vault;
        allVaults.push(vault);

        // Authorize agent in TradeJournal
        ITradeJournal(tradeJournal).authorizeAgent(agentAddress);

        // Authorize vault in ReputationRegistry
        IReputationRegistry(reputationRegistry).authorizeCaller(vault);

        emit VaultCreated(msg.sender, agentAddress, vault, block.timestamp);
    }

    // ── Read helpers ──────────────────────────────────────────
    function getVault(address user) external view returns (address) {
        return userVault[user];
    }

    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    function hasVault(address user) external view returns (bool) {
        return userVault[user] != address(0);
    }
}
