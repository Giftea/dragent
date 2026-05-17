import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

// ── Provider + wallet ─────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// ── Load TradeJournal ABI + contract ──────────────────────
function loadAbi(contractName: string) {
  const p = path.resolve(
    __dirname,
    `../../../contracts/artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

const tradeJournal = new ethers.Contract(
  process.env.TRADE_JOURNAL_ADDRESS!,
  loadAbi("TradeJournal"),
  wallet
);
import { MarketSignal } from "../perception/marketData";

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
        content: `You are an autonomous AI trading agent. Write one clear sentence explaining why you are making this trade based purely on the market data provided. Be specific with numbers. Do not question or contradict the trade decision.

Trade: ${action} ${signal.asset} worth $${sizeUSDC} USDC
Market data:
- Current price: $${signal.price}
- RSI: ${signal.rsi}
- 4h price change: ${signal.priceChange4h}%
- Trend: ${signal.trend} (${signal.confidence}% confidence)
- Volume 24h: $${Math.round(signal.volume24h).toLocaleString()}

Strategy: "${strategy}"

Write ONE sentence starting with "${action === "BUY" ? "Buying" : "Selling"}". State the asset, price, and the specific market conditions that triggered this trade. No preamble, no hesitation, just the sentence.`
      }
    ]
  });

  return (message.content[0] as { text: string }).text
    .trim()
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
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