import * as dotenv from "dotenv";
dotenv.config();

import { generateReason, logTradeOnChain } from "./journal/reasonGenerator";

// Simulate a signal that would trigger a BUY
const mockSignal = {
  asset:         "ETH",
  price:         2051.32,
  rsi:           28.5,           // below 35 — triggers buy
  priceChange4h: -3.2,
  volume24h:     18_500_000_000,
  trend:         "bearish" as const,
  confidence:    78,
  timestamp:     Date.now(),
};

async function testTrade() {
  console.log("🧪 Running test trade...\n");

  const strategy = "Buy ETH when RSI drops below 35. Never risk more than 2% per trade.";
  const sizeUSDC = 2;

  console.log("✍️  Generating reason via Claude...");
  const reason = await generateReason(mockSignal, "BUY", sizeUSDC, strategy);
  console.log(`   Reason: "${reason}"\n`);

  console.log("📝 Logging trade to Kite chain...");
  const { tradeId, reasonHash, txHash } = await logTradeOnChain(
    mockSignal,
    "BUY",
    sizeUSDC,
    reason
  );

  console.log("\n✅ Test trade complete!");
  console.log(`   Trade ID:    ${tradeId}`);
  console.log(`   Reason hash: ${reasonHash}`);
  console.log(`   Tx:          https://testnet.kitescan.ai/tx/${txHash}`);
  console.log(`\n🔍 Verify on explorer:`);
  console.log(`   https://testnet.kitescan.ai/address/${process.env.TRADE_JOURNAL_ADDRESS}`);
}

testTrade().catch(console.error);