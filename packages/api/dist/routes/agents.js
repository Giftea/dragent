"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const contractService_1 = require("../services/contractService");
const agentRunner_1 = require("../agents/agentRunner");
const core_1 = require("@dragent/core");
const ethers_1 = require("ethers");
const aaService_1 = require("../services/aaService");
const x402_1 = require("../middleware/x402");
const router = (0, express_1.Router)();
// POST /api/agents — create agent + deploy vault for user
router.post("/", async (req, res) => {
    try {
        const { walletAddress, strategy, rules, agentModes } = req.body;
        if (!walletAddress || !strategy) {
            return res
                .status(400)
                .json({ error: "walletAddress and strategy required" });
        }
        // Get or create user
        let userRes = await (0, db_1.query)("SELECT id FROM users WHERE wallet = $1", [
            walletAddress.toLowerCase(),
        ]);
        if (userRes.rows.length === 0) {
            userRes = await (0, db_1.query)("INSERT INTO users (wallet) VALUES ($1) RETURNING id", [walletAddress.toLowerCase()]);
        }
        const userId = userRes.rows[0].id;
        // Check user doesn't already have an agent
        const existing = await (0, db_1.query)("SELECT id FROM agents WHERE user_id = $1", [
            userId,
        ]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "User already has an agent" });
        }
        // Generate a fresh agent wallet
        const agentWallet = ethers_1.ethers.Wallet.createRandom();
        // Deploy vault via factory on Kite
        console.log(`Deploying vault for user ${walletAddress}...`);
        const vaultAddress = await (0, contractService_1.deployUserVault)(agentWallet.address);
        const modes = agentModes ?? { signal: true, arb: false, allocation: false };
        // Save agent to DB
        const agentRes = await (0, db_1.query)(`INSERT INTO agents
        (user_id, wallet, vault_address, strategy, rules, status, agent_modes)
       VALUES ($1, $2, $3, $4, $5, 'inactive', $6)
       RETURNING id`, [
            userId,
            agentWallet.address,
            vaultAddress,
            strategy,
            JSON.stringify(rules),
            JSON.stringify(modes),
        ]);
        const agentId = agentRes.rows[0].id;
        return res.status(201).json({
            agentId,
            agentWallet: agentWallet.address,
            vaultAddress,
            strategy,
            status: "inactive",
            message: "Agent created. Call /start to activate.",
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create agent" });
    }
});
// POST /api/agents/:id/start
router.post("/:id/start", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agent = await (0, db_1.query)("SELECT * FROM agents WHERE id = $1", [agentId]);
        if (agent.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }
        const a = agent.rows[0];
        await (0, agentRunner_1.startAgent)({
            agentId,
            agentWallet: a.wallet,
            vaultAddress: a.vault_address,
            strategy: a.strategy,
            privateKey: process.env.PRIVATE_KEY, // server-managed key for now
        });
        return res.json({ status: "active", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to start agent" });
    }
});
// POST /api/agents/:id/stop
router.post("/:id/stop", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        await (0, agentRunner_1.stopAgent)(agentId);
        return res.json({ status: "inactive", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to stop agent" });
    }
});
// GET /api/agents/:id — agent status + stats
router.get("/:id", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agentRes = await (0, db_1.query)("SELECT * FROM agents WHERE id = $1", [
            agentId,
        ]);
        if (agentRes.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }
        const agent = agentRes.rows[0];
        const chainStats = await (0, contractService_1.getAgentStats)(agent.wallet);
        const tradesRes = await (0, db_1.query)(`SELECT trade_id, asset, direction, size_usdc, price_usd,
              reason, reason_hash, tx_hash, won, pnl_bps, created_at
       FROM trades
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT 10`, [agentId]);
        const trades = tradesRes.rows;
        return res.json({
            ...agent,
            chainStats,
            recentTrades: trades,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch agent" });
    }
});
// GET /api/agents/:id/trades
router.get("/:id/trades", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const trades = await (0, db_1.query)(`SELECT
         trade_id, asset, direction, size_usdc,
         price_usd, reason, reason_hash, tx_hash,
         won, pnl_bps, created_at
       FROM trades
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT 50`, [agentId]);
        return res.json(trades.rows);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch trades" });
    }
});
// GET /api/agents/by-wallet/:wallet
router.get("/by-wallet/:wallet", async (req, res) => {
    try {
        const wallet = req.params.wallet.toLowerCase();
        const result = await (0, db_1.query)(`SELECT a.id as "agentId" FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE u.wallet = $1 LIMIT 1`, [wallet]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No agent found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to check agent" });
    }
});
// PATCH /api/agents/:id/strategy
router.patch("/:id/strategy", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const { strategy, rules } = req.body;
        if (!strategy || !rules) {
            return res.status(400).json({ error: "strategy and rules required" });
        }
        await (0, db_1.query)(`UPDATE agents 
       SET strategy = $1, rules = $2, updated_at = NOW() 
       WHERE id = $3`, [strategy, JSON.stringify(rules), agentId]);
        return res.json({
            success: true,
            message: "Strategy updated. Agent will use new rules on next cycle.",
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update strategy" });
    }
});
// GET /api/agents/:id/aa-wallet
router.get("/:id/aa-wallet", async (req, res) => {
    try {
        const agentRes = await (0, db_1.query)("SELECT wallet FROM agents WHERE id = $1", [
            parseInt(req.params.id),
        ]);
        if (agentRes.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }
        const agentWallet = agentRes.rows[0].wallet;
        const aaAddress = (0, aaService_1.getAAWalletAddress)(agentWallet);
        const balance = await (0, aaService_1.getAAWalletBalance)(agentWallet);
        return res.json({
            signerWallet: agentWallet,
            aaWallet: aaAddress,
            balance,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to get AA wallet" });
    }
});
// GET /api/reputation/:address — 0.01 PYUSD
router.get("/reputation/:address", (0, x402_1.requirePayment)("10000000000000000", "Reputation lookup — Kite chain data", "/api/agents/reputation/:address"), async (req, res) => {
    try {
        const { address } = req.params;
        const stats = await contractService_1.reputationRegistry.getStats(address);
        const tier = await contractService_1.reputationRegistry.getTier(address);
        return res.json({
            address,
            totalTrades: Number(stats.totalTrades),
            winCount: Number(stats.winCount),
            winRateBps: Number(stats.winRateBps),
            maxDrawdownBps: Number(stats.maxDrawdownBps),
            tier: Number(tier),
            budgetLimit: (await contractService_1.reputationRegistry.getBudgetLimit(address)).toString(),
            source: "Kite chain — ReputationRegistry.sol",
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch reputation" });
    }
});
// POST /api/agents/:id/arb/start
router.post("/:id/arb/start", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        await (0, agentRunner_1.startArbAgent)(agentId);
        return res.json({ status: "arb_active", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to start arb agent" });
    }
});
// POST /api/agents/:id/arb/stop
router.post("/:id/arb/stop", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        (0, agentRunner_1.stopArbAgent)(agentId);
        return res.json({ status: "arb_stopped", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to stop arb agent" });
    }
});
// POST /api/agents/:id/allocation/start
router.post("/:id/allocation/start", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        await (0, agentRunner_1.startAllocationAgent)(agentId);
        return res.json({ status: "allocation_active", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to start allocation agent" });
    }
});
// POST /api/agents/:id/allocation/stop
router.post("/:id/allocation/stop", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        (0, agentRunner_1.stopAllocationAgent)(agentId);
        return res.json({ status: "allocation_stopped", agentId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to stop allocation agent" });
    }
});
// GET /api/agents/:id/pnl
router.get("/:id/pnl", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const result = await (0, db_1.query)(`SELECT
         created_at,
         pnl_bps,
         won,
         asset,
         direction
       FROM trades
       WHERE agent_id = $1
         AND pnl_bps IS NOT NULL
       ORDER BY created_at ASC`, [agentId]);
        let cumulative = 0;
        let wins = 0;
        const series = result.rows.map((row, i) => {
            cumulative += row.pnl_bps;
            if (row.won)
                wins++;
            const total = i + 1;
            const rollingWinPct = Math.round((wins / total) * 1000) / 10;
            return {
                timestamp: row.created_at,
                pnl_bps: row.pnl_bps,
                cumulative_bps: cumulative,
                won: row.won,
                asset: row.asset,
                direction: row.direction,
                decision: total,
                rolling_win_pct: rollingWinPct,
                wins_so_far: wins,
            };
        });
        return res.json({
            series,
            summary: {
                totalDecisions: result.rows.length,
                wins: result.rows.filter((r) => r.won).length,
                losses: result.rows.filter((r) => !r.won).length,
                totalPnlBps: cumulative,
                totalPnlPct: (cumulative / 100).toFixed(2),
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch PnL data" });
    }
});
// GET /api/agents/:id/allocation/yields
router.get("/:id/allocation/yields", async (_req, res) => {
    try {
        const yields = await (0, core_1.fetchProtocolYields)();
        return res.json({ yields });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch yields" });
    }
});
// GET /api/agents/:id/portfolio
router.get("/:id/portfolio", async (req, res) => {
    try {
        const agentId = parseInt(req.params.id);
        const agentRes = await (0, db_1.query)("SELECT * FROM agents WHERE id = $1", [
            agentId,
        ]);
        if (agentRes.rows.length === 0) {
            return res.status(404).json({ error: "Agent not found" });
        }
        const agent = agentRes.rows[0];
        const [allocationRes, arbRes, settledRes] = await Promise.all([
            (0, db_1.query)(`SELECT asset, price_usd, reason, created_at
         FROM trades
         WHERE agent_id = $1 AND asset LIKE '%-%-'
         ORDER BY created_at DESC LIMIT 1`, [agentId]),
            (0, db_1.query)(`SELECT asset, price_usd, reason, created_at
         FROM trades
         WHERE agent_id = $1 AND reason LIKE '%cross-chain%'
         ORDER BY created_at DESC LIMIT 3`, [agentId]),
            (0, db_1.query)(`SELECT
           COUNT(*) as total,
           SUM(CASE WHEN won = true THEN 1 ELSE 0 END) as wins,
           SUM(CASE WHEN won = false THEN 1 ELSE 0 END) as losses,
           SUM(pnl_bps) as total_pnl_bps
         FROM trades
         WHERE agent_id = $1 AND won IS NOT NULL`, [agentId]),
        ]);
        const settled = settledRes.rows[0];
        let currentYield = null;
        try {
            const yields = await (0, core_1.fetchProtocolYields)();
            currentYield = (0, core_1.findBestYield)(yields, "medium", "USDC");
        }
        catch {
            // yields unavailable
        }
        const budgetLimit = Number(agent.chainStats?.budgetLimit ?? 50000000) / 1e6;
        const modes = agent.agent_modes ?? {};
        const portfolio = {
            totalBudget: budgetLimit,
            allocated: modes.allocation ? Math.min(100, budgetLimit) : 0,
            monitoring: modes.signal ? budgetLimit * 0.1 : 0,
            idle: budgetLimit - (modes.allocation ? 100 : 0),
            currency: "USDC",
            agents: {
                signal: {
                    active: modes.signal ?? false,
                    assets: agent.rules?.assets ?? [],
                    decisions: Number(settled.total ?? 0),
                    winRate: settled.total > 0
                        ? Math.round((settled.wins / settled.total) * 1000) / 10
                        : 0,
                },
                arb: {
                    active: modes.arb ?? false,
                    lastScan: arbRes.rows[0]?.created_at ?? null,
                    assetsMonitored: ["ETH", "BTC", "AVAX"],
                    scansTotal: arbRes.rows.length,
                },
                allocation: {
                    active: modes.allocation ?? false,
                    currentProtocol: allocationRes.rows[0]?.asset ?? null,
                    currentApy: allocationRes.rows[0]?.price_usd
                        ? Number(allocationRes.rows[0].price_usd) / 1e8
                        : null,
                    lastUpdated: allocationRes.rows[0]?.created_at ?? null,
                    liveApy: currentYield?.apy ?? null,
                    liveProtocol: currentYield
                        ? `${currentYield.protocol} (${currentYield.chain})`
                        : null,
                },
            },
            performance: {
                totalDecisions: Number(settled.total ?? 0),
                wins: Number(settled.wins ?? 0),
                losses: Number(settled.losses ?? 0),
                totalPnlBps: Number(settled.total_pnl_bps ?? 0),
            },
        };
        return res.json(portfolio);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch portfolio" });
    }
});
exports.default = router;
