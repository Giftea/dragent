import { detectArbOpportunity, generateArbReason } from "./arbDetector";
import { prefetchAllPrices } from "../perception/avalancheData";
import { ethers }  from "ethers";
import * as dotenv from "dotenv";
import * as path   from "path";
import * as fs     from "fs";
dotenv.config();

const ARB_ASSETS = ["ETH", "BTC", "AVAX"];

function loadTradeJournal() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const artifactPath = path.resolve(
    __dirname,
    "../../../contracts/artifacts/contracts/TradeJournal.sol/TradeJournal.json"
  );
  const abi = JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;

  return new ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS!, abi, wallet);
}

export async function logArbOpportunity(
  asset:     string,
  reason:    string,
  price:     number,
  direction: "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE"
): Promise<{ txHash: string; reasonHash: string }> {
  const journal    = loadTradeJournal();
  const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

  const tradeDirection = direction === "AVALANCHE_TO_KITE" ? "BUY" : "SELL";

  const tx = await journal.logTrade(
    asset,
    tradeDirection,
    BigInt(100 * 1e6),
    BigInt(Math.round(price * 1e8)),
    reasonHash
  );

  const receipt = await tx.wait();
  return { txHash: receipt.hash, reasonHash };
}

export async function runArbCycle(agentId: number): Promise<void> {
  console.log(`[Arb Agent ${agentId}] Scanning cross-chain opportunities...`);

  try {
    await prefetchAllPrices();
  } catch {
    console.warn(`[Arb Agent ${agentId}] Price prefetch failed, continuing...`);
  }

  for (const asset of ARB_ASSETS) {
    try {
      const opportunity = await detectArbOpportunity(asset);

      console.log(`[Arb Agent ${agentId}] ${asset}`);
      console.log(`   Avalanche: $${opportunity.avalanchePrice.toFixed(2)}`);
      console.log(`   Kite:      $${opportunity.kitePrice.toFixed(2)}`);
      console.log(`   Spread:    ${opportunity.spreadBps} bps ($${opportunity.spreadUSD.toFixed(2)})`);
      console.log(`   Profitable: ${opportunity.profitable ? "✅ YES" : "❌ NO"}`);

      const reason = await generateArbReason(opportunity);
      console.log(`   Reason: "${reason}"`);

      const { txHash } = await logArbOpportunity(
        asset,
        reason,
        opportunity.avalanchePrice,
        opportunity.direction
      );
      console.log(`[Arb Agent ${agentId}] ✅ Logged on Kite: ${txHash}`);

    } catch (err) {
      console.error(`[Arb Agent ${agentId}] Error scanning ${asset}:`, err);
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}
