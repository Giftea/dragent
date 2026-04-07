import { Router } from "express";
import { query } from "../db";
import {
  deployUserVault,
  getAgentStats,
  getRecentTrades,
} from "../services/contractService";
import { startAgent, stopAgent } from "../agents/agentRunner";
import { ethers } from "ethers";

const router = Router();

// POST /api/agents — create agent + deploy vault for user
router.post("/", async (req, res) => {
  try {
    const { walletAddress, strategy, rules } = req.body;

    if (!walletAddress || !strategy) {
      return res
        .status(400)
        .json({ error: "walletAddress and strategy required" });
    }

    // Get or create user
    let userRes = await query("SELECT id FROM users WHERE wallet = $1", [
      walletAddress.toLowerCase(),
    ]);

    if (userRes.rows.length === 0) {
      userRes = await query(
        "INSERT INTO users (wallet) VALUES ($1) RETURNING id",
        [walletAddress.toLowerCase()],
      );
    }

    const userId = userRes.rows[0].id;

    // Check user doesn't already have an agent
    const existing = await query("SELECT id FROM agents WHERE user_id = $1", [
      userId,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already has an agent" });
    }

    // Generate a fresh agent wallet
    const agentWallet = ethers.Wallet.createRandom();

    // Deploy vault via factory on Kite
    console.log(`Deploying vault for user ${walletAddress}...`);
    const vaultAddress = await deployUserVault(agentWallet.address);

    // Save agent to DB
    const agentRes = await query(
      `INSERT INTO agents
        (user_id, wallet, vault_address, strategy, rules, status)
       VALUES ($1, $2, $3, $4, $5, 'inactive')
       RETURNING id`,
      [
        userId,
        agentWallet.address,
        vaultAddress,
        strategy,
        JSON.stringify(rules),
      ],
    );

    const agentId = agentRes.rows[0].id;

    return res.status(201).json({
      agentId,
      agentWallet: agentWallet.address,
      vaultAddress,
      strategy,
      status: "inactive",
      message: "Agent created. Call /start to activate.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create agent" });
  }
});

// POST /api/agents/:id/start
router.post("/:id/start", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await query("SELECT * FROM agents WHERE id = $1", [agentId]);

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const a = agent.rows[0];
    await startAgent({
      agentId,
      agentWallet: a.wallet,
      vaultAddress: a.vault_address,
      strategy: a.strategy,
      privateKey: process.env.PRIVATE_KEY!, // server-managed key for now
    });

    return res.json({ status: "active", agentId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to start agent" });
  }
});

// POST /api/agents/:id/stop
router.post("/:id/stop", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    await stopAgent(agentId);
    return res.json({ status: "inactive", agentId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to stop agent" });
  }
});

// GET /api/agents/:id — agent status + stats
router.get("/:id", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const agentRes = await query("SELECT * FROM agents WHERE id = $1", [
      agentId,
    ]);

    if (agentRes.rows.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const agent = agentRes.rows[0];
    const chainStats = await getAgentStats(agent.wallet);
    const trades = await getRecentTrades(agent.wallet, 10);

    return res.json({
      ...agent,
      chainStats,
      recentTrades: trades,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch agent" });
  }
});

// GET /api/agents/:id/trades
router.get("/:id/trades", async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);
    const trades = await query(
      "SELECT * FROM trades WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 50",
      [agentId],
    );
    return res.json(trades.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch trades" });
  }
});

// GET /api/agents/by-wallet/:wallet
router.get("/by-wallet/:wallet", async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const result = await query(
      `SELECT a.id as "agentId" FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE u.wallet = $1 LIMIT 1`,
      [wallet],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No agent found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to check agent" });
  }
});

// PATCH /api/agents/:id/strategy
router.patch("/:id/strategy", async (req, res) => {
  try {
    const agentId          = parseInt(req.params.id);
    const { strategy, rules } = req.body;

    if (!strategy || !rules) {
      return res.status(400).json({ error: "strategy and rules required" });
    }

    await query(
      `UPDATE agents 
       SET strategy = $1, rules = $2, updated_at = NOW() 
       WHERE id = $3`,
      [strategy, JSON.stringify(rules), agentId]
    );

    return res.json({ success: true, message: "Strategy updated. Agent will use new rules on next cycle." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update strategy" });
  }
});

export default router;
