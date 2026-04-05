import * as dotenv from "dotenv";
dotenv.config();

import { getMarketSignal } from "./perception/marketData";
import { interpretStrategy, evaluateSignal } from "./strategy/interpreter";
import { generateReason, logTradeOnChain } from "./journal/reasonGenerator";
import { isAgentPaused, getRemainingBudget } from "./contracts";

const STRATEGY =
  "Buy ETH when RSI drops below 35. Never risk more than 2% per trade. Stop loss at 5%.";

const ASSETS = [{ symbol: "ETH", coinId: "ethereum" }];

const POLL_INTERVAL_MS = 60_000;

async function runAgent() {
  console.log("🤖 Kite Trading Agent starting...");
  console.log(`📋 Strategy: "${STRATEGY}"`);
  console.log(`⏱  Polling every ${POLL_INTERVAL_MS / 1000}s\n`);

  // Parse strategy once at startup
  const rules = await interpretStrategy(STRATEGY);
  console.log("✅ Strategy parsed:", JSON.stringify(rules, null, 2));

  while (true) {
    try {
      const paused = await isAgentPaused();
      if (paused) {
        console.log("⏸  Agent is paused. Waiting...");
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const budget = await getRemainingBudget();
      if (budget === 0n) {
        console.log("💸 Daily budget exhausted. Waiting...");
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      for (const { symbol, coinId } of ASSETS) {
        console.log(`\n🔍 Scanning ${symbol}...`);
        const signal = await getMarketSignal(symbol, coinId);
        console.log(
          `   Price: $${signal.price} | RSI: ${signal.rsi} | Trend: ${signal.trend} (${signal.confidence}%)`
        );

        const evaluation = evaluateSignal(signal, rules);
        console.log(`   Decision: ${evaluation.action} — ${evaluation.reason}`);

        // Only proceed if we have an actionable signal
        if (!evaluation.shouldTrade || evaluation.action === "HOLD") continue;

        const sizeUSDC = 2;

        console.log(`\n✍️  Generating trade reason...`);
        const reason = await generateReason(
          signal,
          evaluation.action,  // now guaranteed to be "BUY" | "SELL"
          sizeUSDC,
          STRATEGY
        );
        console.log(`   Reason: "${reason}"`);

        const { tradeId, txHash } = await logTradeOnChain(
          signal,
          evaluation.action,
          sizeUSDC,
          reason
        );

        console.log(`\n🚀 Trade ${tradeId} committed to Kite chain`);
        console.log(`   https://testnet.kitescan.ai/tx/${txHash}`);
      }
    } catch (err) {
      console.error("❌ Agent error:", err);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

runAgent();