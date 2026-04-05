import { getMarketSignal }                   from "../../../agent/src/perception/marketData";
import { interpretStrategy, evaluateSignal } from "../../agent/src/strategy/interpreter";
import { generateReason, logTradeOnChain }   from "../../agent/src/journal/reasonGenerator";
import { ethers }                            from "ethers";
import { query }                             from "../db";

interface AgentConfig {
  agentId:       number;
  agentWallet:   string;
  vaultAddress:  string;
  strategy:      string;
  privateKey:    string;
}

// Map of agentId => interval handle
const runningAgents = new Map<number, NodeJS.Timeout>();

export async function startAgent(config: AgentConfig) {
  if (runningAgents.has(config.agentId)) {
    console.log(`Agent ${config.agentId} already running`);
    return;
  }

  console.log(`🚀 Starting agent ${config.agentId} for vault ${config.vaultAddress}`);

  // Parse strategy once
  const rules = await interpretStrategy(config.strategy);

  const interval = setInterval(async () => {
    try {
      await runAgentCycle(config, rules);
    } catch (err) {
      console.error(`Agent ${config.agentId} cycle error:`, err);
    }
  }, 60_000); // every 60 seconds

  runningAgents.set(config.agentId, interval);

  // Update status in DB
  await query(
    "UPDATE agents SET status = 'active', updated_at = NOW() WHERE id = $1",
    [config.agentId]
  );
}

export async function stopAgent(agentId: number) {
  const interval = runningAgents.get(agentId);
  if (interval) {
    clearInterval(interval);
    runningAgents.delete(agentId);
    await query(
      "UPDATE agents SET status = 'inactive', updated_at = NOW() WHERE id = $1",
      [agentId]
    );
    console.log(`⏹ Agent ${agentId} stopped`);
  }
}

export function getRunningAgents(): number[] {
  return Array.from(runningAgents.keys());
}

async function runAgentCycle(
  config: AgentConfig,
  rules:  Awaited<ReturnType<typeof interpretStrategy>>
) {
  const assets = [{ symbol: "ETH", coinId: "ethereum" }];

  for (const { symbol, coinId } of assets) {
    const signal     = await getMarketSignal(symbol, coinId);
    const evaluation = evaluateSignal(signal, rules);

    console.log(
      `[Agent ${config.agentId}] ${symbol} — RSI: ${signal.rsi} — ${evaluation.action}`
    );

    if (!evaluation.shouldTrade || evaluation.action === "HOLD") continue;

    const sizeUSDC = 2;
    const reason   = await generateReason(
      signal,
      evaluation.action,
      sizeUSDC,
      config.strategy
    );

    const { tradeId, reasonHash, txHash } = await logTradeOnChain(
      signal,
      evaluation.action,
      sizeUSDC,
      reason
    );

    // Save to DB for fast frontend reads
    await query(
      `INSERT INTO trades
        (agent_id, trade_id, asset, direction, size_usdc, price_usd, reason, reason_hash, tx_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        config.agentId,
        Number(tradeId),
        signal.asset,
        evaluation.action,
        sizeUSDC,
        signal.price,
        reason,
        reasonHash,
        txHash,
      ]
    );

    console.log(`[Agent ${config.agentId}] Trade ${tradeId} logged on Kite ✅`);
  }
}