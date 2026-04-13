import {
  getMarketSignal,
  interpretStrategy,
  evaluateSignal,
  generateReason,
  logTradeOnChain,
  TradingRules,
} from "@dragent/core";
import { ethers } from "ethers";
import { query } from "../db";
import { notifyTrade } from "../services/notificationService";
import { logTradeViaAA } from "../services/aaService";

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
  }, 60_000);

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
    ETH: "ethereum",
    BTC: "bitcoin",
    SOL: "solana",
    BNB: "binancecoin",
    ARB: "arbitrum",
  };

  for (const symbol of assets) {
    const coinId = assetMap[symbol] ?? "ethereum";
    const signal = await getMarketSignal(symbol, coinId);

    const evaluation = evaluateSignal(signal, rules as unknown as TradingRules);

    console.log(
      `[Agent ${config.agentId}] ${symbol} — RSI: ${signal.rsi} — ${evaluation.action}`,
    );

    if (!evaluation.shouldTrade || evaluation.action === "HOLD") continue;

    const sizeUSDC = 2;

    console.log(`[Agent ${config.agentId}] Generating reason...`);
    const reason = await generateReason(
      signal,
      evaluation.action,
      sizeUSDC,
      strategy,
    );

    // Generate reason hash locally
    const { ethers } = await import("ethers");
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

    // Log trade via AA SDK
    console.log(`[Agent ${config.agentId}] Logging via AA SDK...`);
    const { txHash } = await logTradeViaAA(
      config.agentWallet,
      process.env.TRADE_JOURNAL_ADDRESS!,
      signal.asset,
      evaluation.action,
      BigInt(Math.round(sizeUSDC * 1e6)),
      BigInt(Math.round(signal.price * 1e8)),
      reasonHash,
    );

    // Use timestamp as local trade reference since tradeId comes from chain event
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
}
