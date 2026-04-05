// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationRegistry.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentVault {

    // ── Events ────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event TradeExecuted(address indexed agent, string asset, string direction, uint256 size);
    event CircuitBreakerTriggered(address indexed agent, uint256 drawdownBps);
    event AgentPaused(address indexed agent);
    event AgentResumed(address indexed agent);
    event SpendingRulesUpdated(address indexed user);

    // ── Structs ───────────────────────────────────────────────
    struct SpendingRules {
        uint256 maxDrawdownBps;      // max allowed drawdown in bps (e.g. 1000 = 10%)
        uint256 maxPositionSizeBps;  // max single trade size as % of balance (e.g. 200 = 2%)
        uint256 maxDailySpendUSDC;   // max USDC spent per day
        uint256 cooldownSeconds;     // pause duration after circuit-breaker fires
    }

    struct AgentState {
        bool    paused;
        uint256 pausedAt;
        uint256 dailySpent;
        uint256 dayStart;
        uint256 peakBalanceUSDC;     // for drawdown calculation
        uint256 currentBalanceUSDC;  // agent's allocated balance
    }

    // ── Storage ───────────────────────────────────────────────
    IERC20                public settlementToken;  // USDC on Kite
    IReputationRegistry   public reputationRegistry;

    address public owner;
    address public agent;          // the authorized trading agent address

    SpendingRules public rules;
    AgentState    public state;

    // Total user deposits (separate from agent's allocated slice)
    uint256 public totalDeposited;

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Not agent");
        _;
    }

    modifier notPaused() {
        _checkAndResume();
        require(!state.paused, "Agent is paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address _settlementToken,
        address _reputationRegistry,
        address _agent,
        uint256 _maxDrawdownBps,
        uint256 _maxPositionSizeBps,
        uint256 _maxDailySpendUSDC,
        uint256 _cooldownSeconds
    ) {
        owner               = tx.origin;
        settlementToken     = IERC20(_settlementToken);
        reputationRegistry  = IReputationRegistry(_reputationRegistry);
        agent               = _agent;

        rules = SpendingRules({
            maxDrawdownBps:     _maxDrawdownBps,
            maxPositionSizeBps: _maxPositionSizeBps,
            maxDailySpendUSDC:  _maxDailySpendUSDC,
            cooldownSeconds:    _cooldownSeconds
        });

        state.dayStart = block.timestamp;
    }

    // ── Deposits & withdrawals ────────────────────────────────
    function deposit(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        settlementToken.transferFrom(msg.sender, address(this), amount);
        totalDeposited           += amount;
        state.currentBalanceUSDC += amount;
        if (amount > state.peakBalanceUSDC) {
            state.peakBalanceUSDC = state.currentBalanceUSDC;
        }
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= state.currentBalanceUSDC, "Insufficient balance");
        state.currentBalanceUSDC -= amount;
        settlementToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ── Spending rules ────────────────────────────────────────
    function updateRules(
        uint256 _maxDrawdownBps,
        uint256 _maxPositionSizeBps,
        uint256 _maxDailySpendUSDC,
        uint256 _cooldownSeconds
    ) external onlyOwner {
        rules.maxDrawdownBps     = _maxDrawdownBps;
        rules.maxPositionSizeBps = _maxPositionSizeBps;
        rules.maxDailySpendUSDC  = _maxDailySpendUSDC;
        rules.cooldownSeconds    = _cooldownSeconds;
        emit SpendingRulesUpdated(msg.sender);
    }

    // ── Trade execution ───────────────────────────────────────
    function executeTrade(
        string  calldata asset,
        string  calldata direction,
        uint256 sizeUSDC,
        address dexRouter,
        bytes   calldata swapCalldata
    ) external onlyAgent notPaused returns (bool success) {
        // 1. Reset daily window if needed
        _resetDailyIfNeeded();

        // 2. Enforce budget from reputation tier
        uint256 budgetLimit = reputationRegistry.getBudgetLimit(agent);
        require(state.currentBalanceUSDC <= budgetLimit, "Exceeds reputation budget");

        // 3. Enforce position size limit
        uint256 maxSize = (state.currentBalanceUSDC * rules.maxPositionSizeBps) / 10000;
        require(sizeUSDC <= maxSize, "Exceeds max position size");

        // 4. Enforce daily spend limit
        require(state.dailySpent + sizeUSDC <= rules.maxDailySpendUSDC, "Daily limit reached");

        // 5. Approve and execute swap via DEX router
        settlementToken.transfer(dexRouter, sizeUSDC);
        (success,) = dexRouter.call(swapCalldata);
        require(success, "Swap failed");

        // 6. Update state
        state.dailySpent         += sizeUSDC;
        state.currentBalanceUSDC -= sizeUSDC;

        // 7. Check drawdown circuit-breaker
        _checkDrawdown();

        emit TradeExecuted(agent, asset, direction, sizeUSDC);
    }

    // ── Settlement: called after trade resolves ───────────────
    function settleTrade(
        bool    won,
        int256  pnlBps,
        uint256 returnedUSDC    // actual USDC returned from the trade
    ) external onlyAgent {
        // Update balance with actual return
        state.currentBalanceUSDC += returnedUSDC;

        // Update peak for drawdown tracking
        if (state.currentBalanceUSDC > state.peakBalanceUSDC) {
            state.peakBalanceUSDC = state.currentBalanceUSDC;
        }

        // Record outcome on-chain in ReputationRegistry
        reputationRegistry.recordTrade(agent, won, pnlBps);

        // Re-check drawdown after settlement
        _checkDrawdown();
    }

    // ── Circuit breaker ───────────────────────────────────────
    function _checkDrawdown() internal {
        if (state.peakBalanceUSDC == 0) return;
        uint256 drawdownBps = ((state.peakBalanceUSDC - state.currentBalanceUSDC) * 10000)
                              / state.peakBalanceUSDC;
        if (drawdownBps >= rules.maxDrawdownBps) {
            state.paused   = true;
            state.pausedAt = block.timestamp;
            emit CircuitBreakerTriggered(agent, drawdownBps);
            emit AgentPaused(agent);
        }
    }

    function _checkAndResume() internal {
        if (state.paused && block.timestamp >= state.pausedAt + rules.cooldownSeconds) {
            state.paused = false;
            emit AgentResumed(agent);
        }
    }

    // Owner can manually pause/resume
    function pause() external onlyOwner {
        state.paused   = true;
        state.pausedAt = block.timestamp;
        emit AgentPaused(agent);
    }

    function resume() external onlyOwner {
        state.paused = false;
        emit AgentResumed(agent);
    }

    // ── Daily window reset ────────────────────────────────────
    function _resetDailyIfNeeded() internal {
        if (block.timestamp >= state.dayStart + 1 days) {
            state.dailySpent = 0;
            state.dayStart   = block.timestamp;
        }
    }

    // ── Read helpers ──────────────────────────────────────────
    function getBalance() external view returns (uint256) {
        return state.currentBalanceUSDC;
    }

    function isPaused() external view returns (bool) {
        return state.paused;
    }

    function getCurrentDrawdownBps() external view returns (uint256) {
        if (state.peakBalanceUSDC == 0) return 0;
        if (state.currentBalanceUSDC >= state.peakBalanceUSDC) return 0;
        return ((state.peakBalanceUSDC - state.currentBalanceUSDC) * 10000)
               / state.peakBalanceUSDC;
    }

    function getRemainingDailyBudget() external view returns (uint256) {
        if (state.dailySpent >= rules.maxDailySpendUSDC) return 0;
        return rules.maxDailySpendUSDC - state.dailySpent;
    }
}