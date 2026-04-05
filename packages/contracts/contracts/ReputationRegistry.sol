// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationRegistry {

    // ── Events ────────────────────────────────────────────────
    event TradeRecorded(
        address indexed agentId,
        bool    won,
        int256  pnlBps,
        uint256 newWinRate,
        uint8   newTier
    );

    event TierUpgraded(address indexed agentId, uint8 oldTier, uint8 newTier);

    // ── Budget tiers ──────────────────────────────────────────
    // Tier 0: sandbox    — $50   max budget
    // Tier 1: apprentice — $500  max budget  (requires 60% win-rate, 10+ trades)
    // Tier 2: trader     — $5000 max budget  (requires 65% win-rate, 50+ trades)
    // Tier 3: expert     — unlimited         (requires 70% win-rate, 200+ trades)

    uint8  public constant MAX_TIER = 3;

    uint256[4] public tierBudgetUSDC = [
        50   * 1e6,   // Tier 0: $50
        500  * 1e6,   // Tier 1: $500
        5000 * 1e6,   // Tier 2: $5,000
        type(uint256).max  // Tier 3: unlimited
    ];

    // Win-rate thresholds to reach each tier (in basis points, 6000 = 60%)
    uint256[4] public tierWinRateThreshold = [0, 6000, 6500, 7000];

    // Minimum trades to reach each tier
    uint256[4] public tierMinTrades = [0, 10, 50, 200];

    // ── Agent stats ───────────────────────────────────────────
    struct AgentStats {
        uint256 totalTrades;
        uint256 winCount;
        int256  totalPnlBps;      // cumulative PnL in basis points
        int256  maxDrawdownBps;   // worst single-trade loss in bps
        uint256 winRateBps;       // rolling win-rate (0–10000)
        uint8   tier;
        uint256 lastTradeAt;
    }

    mapping(address => AgentStats) public stats;

    // ── Access control ────────────────────────────────────────
    address public owner;

    // TradeJournal contract address — only it can record trades
    address public tradeJournal;

    // Also allow direct agent registration for flexibility
    mapping(address => bool) public authorizedCallers;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyCaller() {
        require(
            authorizedCallers[msg.sender] || msg.sender == tradeJournal,
            "Not authorized"
        );
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(address _tradeJournal) {
        owner = msg.sender;
        tradeJournal = _tradeJournal;
        authorizedCallers[msg.sender] = true;
    }

    // ── Management ────────────────────────────────────────────
    function authorizeCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    function setTradeJournal(address _tradeJournal) external onlyOwner {
        tradeJournal = _tradeJournal;
    }

    // ── Core: record a trade outcome ──────────────────────────
    function recordTrade(
        address agentId,
        bool    won,
        int256  pnlBps        // positive = profit, negative = loss, in basis points
    ) external onlyCaller {
        AgentStats storage s = stats[agentId];

        s.totalTrades++;
        s.totalPnlBps += pnlBps;
        s.lastTradeAt  = block.timestamp;

        if (won) s.winCount++;

        // Track worst drawdown
        if (pnlBps < s.maxDrawdownBps) {
            s.maxDrawdownBps = pnlBps;
        }

        // Recalculate win-rate in basis points (0–10000)
        s.winRateBps = (s.winCount * 10000) / s.totalTrades;

        // Check for tier upgrade
        uint8 newTier = _calculateTier(s);
        if (newTier > s.tier) {
            emit TierUpgraded(agentId, s.tier, newTier);
            s.tier = newTier;
        }

        emit TradeRecorded(agentId, won, pnlBps, s.winRateBps, s.tier);
    }

    // ── Tier calculation ──────────────────────────────────────
    function _calculateTier(AgentStats storage s) internal view returns (uint8) {
        for (uint8 t = MAX_TIER; t > 0; t--) {
            if (
                s.winRateBps  >= tierWinRateThreshold[t] &&
                s.totalTrades >= tierMinTrades[t]
            ) {
                return t;
            }
        }
        return 0;
    }

    // ── Read helpers ──────────────────────────────────────────
    function getStats(address agentId) external view returns (AgentStats memory) {
        return stats[agentId];
    }

    function getTier(address agentId) external view returns (uint8) {
        return stats[agentId].tier;
    }

    function getBudgetLimit(address agentId) external view returns (uint256) {
        return tierBudgetUSDC[stats[agentId].tier];
    }

    function getWinRate(address agentId) external view returns (uint256) {
        return stats[agentId].winRateBps;
    }

    // Returns true if agent meets requirements for a given tier
    function meetsRequirements(address agentId, uint8 tier) external view returns (bool) {
        if (tier > MAX_TIER) return false;
        AgentStats storage s = stats[agentId];
        return (
            s.winRateBps  >= tierWinRateThreshold[tier] &&
            s.totalTrades >= tierMinTrades[tier]
        );
    }
}