"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAgent = startAgent;
exports.stopAgent = stopAgent;
exports.getRunningAgents = getRunningAgents;
exports.startArbAgent = startArbAgent;
exports.stopArbAgent = stopArbAgent;
exports.startAllocationAgent = startAllocationAgent;
exports.stopAllocationAgent = stopAllocationAgent;
const core_1 = require("@dragent/core");
const ethers_1 = require("ethers");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
// ── Evaluate outcome 5 minutes after decision ─────────────
async function settleDecisionOutcome(agentWallet, asset, direction, entryPrice, agentId, tradeDbId) {
    console.log(`[Settlement] Scheduled: ${asset} ${direction} @ $${entryPrice}`);
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
    console.log(`[Settlement] Running for ${asset}...`);
    try {
        const assetMap = {
            ETH: "ethereum",
            BTC: "bitcoin",
            SOL: "solana",
            AVAX: "avalanche-2",
        };
        const coinId = assetMap[asset] ?? "ethereum";
        let exitPrice = entryPrice; // fallback to entry price if fetch fails
        try {
            const signal = await (0, core_1.getMarketSignal)(asset, coinId);
            exitPrice = signal.price;
        }
        catch (err) {
            console.warn(`[Settlement] Price fetch failed for ${asset}, using entry price`);
        }
        const won = direction === "BUY" ? exitPrice > entryPrice : exitPrice < entryPrice;
        const pnlBps = direction === "BUY"
            ? Math.round(((exitPrice - entryPrice) / entryPrice) * 10000)
            : Math.round(((entryPrice - exitPrice) / entryPrice) * 10000);
        console.log(`[Settlement] ${asset}: Entry $${entryPrice} → Exit $${exitPrice}`);
        console.log(`[Settlement] Result: ${won ? "✅ WON" : "❌ LOST"} (${pnlBps} bps)`);
        // Update DB
        await (0, db_1.query)(`UPDATE trades SET won = $1, pnl_bps = $2 WHERE id = $3`, [won, pnlBps, tradeDbId]);
        // Record on ReputationRegistry
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
        const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const registry = new ethers_1.ethers.Contract(process.env.REPUTATION_REGISTRY_ADDRESS, core_1.REPUTATION_REGISTRY_ABI, wallet);
        const tx = await registry.recordTrade(agentWallet, won, BigInt(pnlBps));
        await tx.wait();
        console.log(`[Settlement] ✅ Reputation updated on Kite chain`);
    }
    catch (err) {
        console.error(`[Settlement] Error for ${asset}:`, err);
    }
}
// Map of agentId => interval handle
const runningAgents = new Map();
async function startAgent(config) {
    if (runningAgents.has(config.agentId)) {
        console.log(`Agent ${config.agentId} already running`);
        return;
    }
    console.log(`🚀 Starting agent ${config.agentId} for vault ${config.vaultAddress}`);
    const interval = setInterval(async () => {
        try {
            // Reload rules from DB on every cycle — picks up changes instantly
            const agentRes = await (0, db_1.query)("SELECT rules, strategy, status FROM agents WHERE id = $1", [config.agentId]);
            if (!agentRes.rows[0] || agentRes.rows[0].status !== "active") {
                console.log(`[Agent ${config.agentId}] Skipping — not active`);
                return;
            }
            const freshRules = agentRes.rows[0].rules;
            const strategy = agentRes.rows[0].strategy;
            await runAgentCycle(config, freshRules, strategy);
        }
        catch (err) {
            console.error(`Agent ${config.agentId} cycle error:`, err);
        }
    }, 2 * 60000); // every 2 minutes
    runningAgents.set(config.agentId, interval);
    await (0, db_1.query)("UPDATE agents SET status = 'active', updated_at = NOW() WHERE id = $1", [config.agentId]);
}
async function stopAgent(agentId) {
    const interval = runningAgents.get(agentId);
    if (interval) {
        clearInterval(interval);
        runningAgents.delete(agentId);
        await (0, db_1.query)("UPDATE agents SET status = 'inactive', updated_at = NOW() WHERE id = $1", [agentId]);
        console.log(`⏹ Agent ${agentId} stopped`);
    }
}
function getRunningAgents() {
    return Array.from(runningAgents.keys());
}
async function runAgentCycle(config, rules, strategy) {
    const assets = rules.assets ?? ["ETH"];
    const assetMap = {
        ETH: "ethereum",
        BTC: "bitcoin",
        SOL: "solana",
        AVAX: "avalanche-2",
        BNB: "binancecoin",
        ARB: "arbitrum",
    };
    for (const symbol of assets) {
        const coinId = assetMap[symbol] ?? "ethereum";
        const signal = await (0, core_1.getMarketSignal)(symbol, coinId);
        const evaluation = (0, core_1.evaluateSignal)(signal, rules);
        console.log(`[Agent ${config.agentId}] ${symbol} — RSI: ${signal.rsi} — ${evaluation.action}`);
        if (evaluation.shouldTrade && evaluation.action !== "HOLD") {
            const sizeUSDC = 2;
            console.log(`[Agent ${config.agentId}] Generating reason...`);
            const reason = await (0, core_1.generateReason)(signal, evaluation.action, sizeUSDC, strategy);
            const reasonHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(reason));
            // Skip AA SDK until bundler is stable — use direct tx
            const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
            const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
            const journal = new ethers_1.ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS, ["function logTrade(string,string,uint256,uint256,bytes32) returns (uint256)"], wallet);
            const tx = await journal.logTrade(signal.asset, evaluation.action, BigInt(Math.round(sizeUSDC * 1e6)), BigInt(Math.round(signal.price * 1e8)), reasonHash);
            const receipt = await tx.wait();
            const txHash = receipt.hash;
            console.log(`[Agent ${config.agentId}] ✅ Decision logged: ${txHash}`);
            const localTradeRef = Date.now();
            await (0, db_1.query)(`INSERT INTO trades
          (agent_id, trade_id, asset, direction, size_usdc, price_usd, reason, reason_hash, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
                config.agentId,
                localTradeRef,
                signal.asset,
                evaluation.action,
                sizeUSDC,
                signal.price,
                reason,
                reasonHash,
                txHash,
            ]);
            const tradeDbRes = await (0, db_1.query)("SELECT id FROM trades WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1", [config.agentId]);
            const tradeDbId = tradeDbRes.rows[0]?.id;
            settleDecisionOutcome(config.agentWallet, signal.asset, evaluation.action, signal.price, config.agentId, tradeDbId).catch((err) => console.error("Settlement error:", err));
            await (0, notificationService_1.notifyTrade)({
                agentId: config.agentId,
                asset: signal.asset,
                direction: evaluation.action,
                sizeUSDC,
                price: signal.price,
                reason,
                reasonHash,
                txHash,
            });
            console.log(`[Agent ${config.agentId}] ✅ Trade logged on Kite: ${txHash}`);
        }
        await new Promise(r => setTimeout(r, 5000)); // 5 seconds between assets
    }
}
// ── Arb agent ─────────────────────────────────────────────
const runningArbAgents = new Map();
async function startArbAgent(agentId) {
    if (runningArbAgents.has(agentId))
        return;
    console.log(`🔀 Starting arb agent ${agentId}`);
    const agentRes = await (0, db_1.query)("SELECT wallet FROM agents WHERE id = $1", [agentId]);
    const agentWallet = agentRes.rows[0]?.wallet;
    if (!agentWallet)
        throw new Error("Agent wallet not found");
    const runCycleAndSave = async () => {
        const results = await (0, core_1.runArbCycle)(agentId, agentWallet);
        for (const r of results) {
            await (0, db_1.query)(`INSERT INTO trades
          (agent_id, trade_id, asset, direction, size_usdc, price_usd, reason, reason_hash, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [agentId, Date.now(), r.asset, r.direction, 100, r.price, r.reason, r.reasonHash, r.txHash]);
        }
    };
    await runCycleAndSave().catch(console.error);
    const interval = setInterval(() => runCycleAndSave().catch(console.error), 5 * 60000);
    runningArbAgents.set(agentId, interval);
    await (0, db_1.query)(`UPDATE agents SET agent_modes = agent_modes || '{"arb": true}'::jsonb WHERE id = $1`, [agentId]);
}
function stopArbAgent(agentId) {
    const interval = runningArbAgents.get(agentId);
    if (interval) {
        clearInterval(interval);
        runningArbAgents.delete(agentId);
        console.log(`⏹ Arb agent ${agentId} stopped`);
    }
}
// ── Allocation agent ───────────────────────────────────────
const runningAllocationAgents = new Map();
async function startAllocationAgent(agentId) {
    if (runningAllocationAgents.has(agentId))
        return;
    console.log(`📊 Starting allocation agent ${agentId}`);
    const runCycleAndSave = async () => {
        const result = await (0, core_1.runAllocationCycle)(agentId);
        if (!result)
            return;
        await (0, db_1.query)(`INSERT INTO trades
        (agent_id, trade_id, asset, direction, size_usdc, price_usd, reason, reason_hash, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [agentId, Date.now(), result.asset, "BUY", 100, result.apy, result.reason, result.reasonHash, result.txHash]);
    };
    await runCycleAndSave().catch(console.error);
    const interval = setInterval(() => runCycleAndSave().catch(console.error), 6 * 60 * 60000);
    runningAllocationAgents.set(agentId, interval);
    await (0, db_1.query)(`UPDATE agents SET agent_modes = agent_modes || '{"allocation": true}'::jsonb WHERE id = $1`, [agentId]);
}
function stopAllocationAgent(agentId) {
    const interval = runningAllocationAgents.get(agentId);
    if (interval) {
        clearInterval(interval);
        runningAllocationAgents.delete(agentId);
        console.log(`⏹ Allocation agent ${agentId} stopped`);
    }
}
