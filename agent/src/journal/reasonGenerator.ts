import Anthropic from "@anthropic-ai/sdk";
import { ethers }  from "ethers";
import { MarketSignal } from "../perception/marketData";
import { tradeJournal, wallet } from "../contracts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Generate human-readable trade reason via Claude ───────
export async function generateReason(
  signal:    MarketSignal,
  action:    "BUY" | "SELL",
  sizeUSDC:  number,
  strategy:  string
): Promise<string> {
  const message = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are an AI trading agent. Write a single clear sentence explaining why you are making this trade. Be specific with the numbers.

Trade: ${action} ${signal.asset} worth $${sizeUSDC} USDC
Market data:
- Current price: $${signal.price}
- RSI: ${signal.rsi}
- 4h price change: ${signal.priceChange4h}%
- Trend: ${signal.trend} (${signal.confidence}% confidence)
- Volume 24h: $${Math.round(signal.volume24h).toLocaleString()}

Strategy: "${strategy}"

Write ONE sentence starting with "${action === "BUY" ? "Buying" : "Selling"}". No preamble, no explanation, just the sentence.`
      }
    ]
  });

  return (message.content[0] as { text: string }).text.trim();
}

// ── Hash the reason and log it on Kite chain ──────────────
export async function logTradeOnChain(
  signal:    MarketSignal,
  action:    "BUY" | "SELL",
  sizeUSDC:  number,
  reason:    string
): Promise<{ tradeId: bigint; reasonHash: string; txHash: string }> {

  // Hash the plain-English reason
  const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

  // Submit to TradeJournal.sol on Kite
  const tx = await tradeJournal.logTrade(
    signal.asset,
    action,
    BigInt(Math.round(sizeUSDC * 1e6)),        // USDC has 6 decimals
    BigInt(Math.round(signal.price * 1e8)),     // price in 8 decimals
    reasonHash
  );

  const receipt = await tx.wait();

  // Parse TradeLogged event to get the tradeId
  const event = receipt.logs
    .map((log: { topics: string[]; data: string }) => {
      try { return tradeJournal.interface.parseLog(log); }
      catch { return null; }
    })
    .find((e: { name: string } | null) => e?.name === "TradeLogged");

  const tradeId = event?.args?.tradeId ?? 0n;

  console.log(`📝 Trade logged on Kite`);
  console.log(`   Trade ID:    ${tradeId}`);
  console.log(`   Reason:      "${reason}"`);
  console.log(`   Reason hash: ${reasonHash}`);
  console.log(`   Tx:          https://testnet.kitescan.ai/tx/${receipt.hash}`);

  return { tradeId, reasonHash, txHash: receipt.hash };
}