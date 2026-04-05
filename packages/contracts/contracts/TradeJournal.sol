// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TradeJournal {

    // ── Events ────────────────────────────────────────────────
    event TradeLogged(
        uint256 indexed tradeId,
        address indexed agentId,
        uint256 timestamp,
        string  asset,
        string  direction,   // "BUY" | "SELL"
        uint256 sizUSDC,     // size in USDC (6 decimals)
        uint256 priceUSD,    // execution price (8 decimals)
        bytes32 reasonHash   // keccak256 of plain-English reason stored on IPFS
    );

    // ── Storage ───────────────────────────────────────────────
    struct Trade {
        uint256 tradeId;
        address agentId;
        uint256 timestamp;
        string  asset;
        string  direction;
        uint256 sizeUSDC;
        uint256 priceUSD;
        bytes32 reasonHash;
    }

    uint256 public tradeCount;

    // tradeId => Trade
    mapping(uint256 => Trade) public trades;

    // agentId => list of tradeIds
    mapping(address => uint256[]) public agentTrades;

    // reasonHash => tradeId  (for verification lookups)
    mapping(bytes32 => uint256) public hashToTrade;

    // ── Access control ────────────────────────────────────────
    // Only registered agents can log trades
    address public owner;
    mapping(address => bool) public authorizedAgents;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(authorizedAgents[msg.sender], "Not an authorized agent");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Agent management ──────────────────────────────────────
    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }

    // ── Core: log a trade ─────────────────────────────────────
    function logTrade(
        string  calldata asset,
        string  calldata direction,
        uint256 sizeUSDC,
        uint256 priceUSD,
        bytes32 reasonHash
    ) external onlyAgent returns (uint256 tradeId) {
        require(
            keccak256(bytes(direction)) == keccak256(bytes("BUY")) ||
            keccak256(bytes(direction)) == keccak256(bytes("SELL")),
            "Direction must be BUY or SELL"
        );
        require(reasonHash != bytes32(0), "Reason hash required");
        require(hashToTrade[reasonHash] == 0, "Duplicate reason hash");

        tradeId = ++tradeCount;

        trades[tradeId] = Trade({
            tradeId:    tradeId,
            agentId:    msg.sender,
            timestamp:  block.timestamp,
            asset:      asset,
            direction:  direction,
            sizeUSDC:   sizeUSDC,
            priceUSD:   priceUSD,
            reasonHash: reasonHash
        });

        agentTrades[msg.sender].push(tradeId);
        hashToTrade[reasonHash] = tradeId;

        emit TradeLogged(
            tradeId,
            msg.sender,
            block.timestamp,
            asset,
            direction,
            sizeUSDC,
            priceUSD,
            reasonHash
        );
    }

    // ── Read helpers ──────────────────────────────────────────
    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        require(tradeId > 0 && tradeId <= tradeCount, "Trade not found");
        return trades[tradeId];
    }

    function getAgentTrades(address agent) external view returns (uint256[] memory) {
        return agentTrades[agent];
    }

    // Verify a reason: given the plain-English string, confirm it matches
    // the on-chain hash for a given tradeId
    function verifyReason(uint256 tradeId, string calldata reason) external view returns (bool) {
        require(tradeId > 0 && tradeId <= tradeCount, "Trade not found");
        return trades[tradeId].reasonHash == keccak256(bytes(reason));
    }

    // Get last N trades for an agent (for the dashboard feed)
    function getRecentTrades(address agent, uint256 n) external view returns (Trade[] memory) {
        uint256[] storage ids = agentTrades[agent];
        uint256 len = ids.length;
        uint256 count = n > len ? len : n;
        Trade[] memory result = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = trades[ids[len - count + i]];
        }
        return result;
    }
}