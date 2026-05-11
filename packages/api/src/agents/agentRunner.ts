import {
  getMarketSignal,
  evaluateSignal,
  generateReason,
  TradingRules,
  runArbCycle,
} from "@dragent/core";
import { ethers } from "ethers";
import { query } from "../db";
import { notifyTrade } from "../services/notificationService";

import { reputationRegistry } from "../services/contractService";

// ── Evaluate outcome 5 minutes after decision ─────────────
async function settleDecisionOutcome(
  agentWallet: string,
  asset: string,
  direction: string,
  entryPrice: number,
  agentId: number,
  tradeDbId: number
): Promise<void> {
  await new Promise((r) => setTimeout(r, 5 * 60 * 1000));

  try {
    const assetMap: Record<string, string> = {
      ETH: "ethereum",
      BTC: "bitcoin",
      SOL: "solana",
    };

    const coinId = assetMap[asset] ?? "ethereum";
    const signal = await getMarketSignal(asset, coinId);
    const exitPrice = signal.price;
    const priceMove = ((exitPrice - entryPrice) / entryPrice) * 10000; // bps

    const won =
      direction === "BUY" ? exitPrice > entryPrice : exitPrice < entryPrice;
    const pnlBps =
      direction === "BUY" ? Math.round(priceMove) : Math.round(-priceMove);

    console.log(`[Agent ${agentId}] Settling decision: ${asset} ${direction}`);
    console.log(`   Entry: $${entryPrice} → Exit: $${exitPrice}`);
    console.log(`   Result: ${won ? "✅ WON" : "❌ LOST"} (${pnlBps} bps)`);

    const tx = await reputationRegistry.recordTrade(
      agentWallet,
      won,
      BigInt(pnlBps)
    );
    await tx.wait();

    console.log(`[Agent ${agentId}] ✅ Reputation updated on Kite chain`);

    await query(`UPDATE trades SET won = $1, pnl_bps = $2 WHERE id = $3`, [
      won,
      pnlBps,
      tradeDbId,
    ]);
  } catch (err) {
    console.error(`[Agent ${agentId}] Settlement error:`, err);
  }
}

interface AgentConfig {
  agentId: number;
  agentWallet: string;
  vaultAddress: string;
  strategy: string;
  privateKey: string;
}

// Map of agentId => interval handle
const runningAgents = new Map<number, NodeJS.Timeout>();

export async function startAgent(config: AgentConfig) {
  if (runningAgents.has(config.agentId)) {
    console.log(`Agent ${config.agentId} already running`);
    return;
  }

  console.log(
    `🚀 Starting agent ${config.agentId} for vault ${config.vaultAddress}`,
  );

  const interval = setInterval(async () => {
    try {
      // Reload rules from DB on every cycle — picks up changes instantly
      const agentRes = await query(
        "SELECT rules, strategy, status FROM agents WHERE id = $1",
        [config.agentId],
      );

      if (!agentRes.rows[0] || agentRes.rows[0].status !== "active") {
        console.log(`[Agent ${config.agentId}] Skipping — not active`);
        return;
      }

      const freshRules = agentRes.rows[0].rules;
      const strategy = agentRes.rows[0].strategy;

      await runAgentCycle(config, freshRules, strategy);
    } catch (err) {
      console.error(`Agent ${config.agentId} cycle error:`, err);
    }
  }, 90_000); // every 90 seconds instead of 60

  runningAgents.set(config.agentId, interval);

  await query(
    "UPDATE agents SET status = 'active', updated_at = NOW() WHERE id = $1",
    [config.agentId],
  );
}

export async function stopAgent(agentId: number) {
  const interval = runningAgents.get(agentId);
  if (interval) {
    clearInterval(interval);
    runningAgents.delete(agentId);
    await query(
      "UPDATE agents SET status = 'inactive', updated_at = NOW() WHERE id = $1",
      [agentId],
    );
    console.log(`⏹ Agent ${agentId} stopped`);
  }
}

export function getRunningAgents(): number[] {
  return Array.from(runningAgents.keys());
}

async function runAgentCycle(
  config: AgentConfig,
  rules: Record<string, unknown>,
  strategy: string,
) {
  const assets = (rules.assets as string[]) ?? ["ETH"];
  const assetMap: Record<string, string> = {
    ETH:  "ethereum",
    BTC:  "bitcoin",
    SOL:  "solana",
    AVAX: "avalanche-2",
    BNB:  "binancecoin",
    ARB:  "arbitrum",
  };

  for (const symbol of assets) {
    const coinId = assetMap[symbol] ?? "ethereum";
    const signal = await getMarketSignal(symbol, coinId);

    const evaluation = evaluateSignal(signal, rules as unknown as TradingRules);

    console.log(
      `[Agent ${config.agentId}] ${symbol} — RSI: ${signal.rsi} — ${evaluation.action}`,
    );

    if (evaluation.shouldTrade && evaluation.action !== "HOLD") {
      const sizeUSDC = 2;

      console.log(`[Agent ${config.agentId}] Generating reason...`);
      const reason = await generateReason(
        signal,
        evaluation.action,
        sizeUSDC,
        strategy,
      );

      const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

      // Skip AA SDK until bundler is stable — use direct tx
      const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
      const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
      const journal  = new ethers.Contract(
        process.env.TRADE_JOURNAL_ADDRESS!,
        ["function logTrade(string,string,uint256,uint256,bytes32) returns (uint256)"],
        wallet,
      );

      const tx      = await journal.logTrade(
        signal.asset,
        evaluation.action,
        BigInt(Math.round(sizeUSDC * 1e6)),
        BigInt(Math.round(signal.price * 1e8)),
        reasonHash,
      );
      const receipt = await tx.wait();
      const txHash  = receipt.hash;
      console.log(`[Agent ${config.agentId}] ✅ Decision logged: ${txHash}`);

      const localTradeRef = Date.now();

      await query(
        `INSERT INTO trades
          (agent_id, trade_id, asset, direction, size_usdc, price_usd, reason, reason_hash, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          config.agentId,
          localTradeRef,
          signal.asset,
          evaluation.action,
          sizeUSDC,
          signal.price,
          reason,
          reasonHash,
          txHash,
        ],
      );

      const tradeDbRes = await query(
        "SELECT id FROM trades WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1",
        [config.agentId],
      );
      const tradeDbId = tradeDbRes.rows[0]?.id;

      settleDecisionOutcome(
        config.agentWallet,
        signal.asset,
        evaluation.action,
        signal.price,
        config.agentId,
        tradeDbId,
      ).catch((err) => console.error("Settlement error:", err));

      await notifyTrade({
        agentId: config.agentId,
        asset: signal.asset,
        direction: evaluation.action as "BUY" | "SELL",
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
const runningArbAgents = new Map<number, NodeJS.Timeout>();

export async function startArbAgent(agentId: number) {
  if (runningArbAgents.has(agentId)) {
    console.log(`Arb agent ${agentId} already running`);
    return;
  }

  console.log(`🔀 Starting arb agent ${agentId}`);

  await runArbCycle(agentId).catch(console.error);

  const interval = setInterval(async () => {
    await runArbCycle(agentId).catch(console.error);
  }, 5 * 60_000);

  runningArbAgents.set(agentId, interval);
}

export function stopArbAgent(agentId: number) {
  const interval = runningArbAgents.get(agentId);
  if (interval) {
    clearInterval(interval);
    runningArbAgents.delete(agentId);
    console.log(`⏹ Arb agent ${agentId} stopped`);
  }
}
