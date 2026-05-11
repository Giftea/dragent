import {
  detectArbOpportunity,
  generateArbReason,
  type ArbOpportunity,
} from "./arbDetector";
import { getAvalanchePrice, prefetchAllPrices } from "../perception/avalancheData";
import { ethers }  from "ethers";
import * as dotenv from "dotenv";
import * as path   from "path";
import * as fs     from "fs";
dotenv.config();

const ARB_ASSETS = ["ETH", "BTC", "AVAX"];

function loadContracts() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const journalPath = path.resolve(
    __dirname,
    "../../../contracts/artifacts/contracts/TradeJournal.sol/TradeJournal.json"
  );
  const registryPath = path.resolve(
    __dirname,
    "../../../contracts/artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json"
  );

  const journal = new ethers.Contract(
    process.env.TRADE_JOURNAL_ADDRESS!,
    JSON.parse(fs.readFileSync(journalPath, "utf8")).abi,
    wallet
  );
  const registry = new ethers.Contract(
    process.env.REPUTATION_REGISTRY_ADDRESS!,
    JSON.parse(fs.readFileSync(registryPath, "utf8")).abi,
    wallet
  );

  return { journal, registry, wallet };
}

export async function logArbOpportunity(
  asset:     string,
  reason:    string,
  price:     number,
  direction: "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE"
): Promise<{ txHash: string; reasonHash: string }> {
  const { journal } = loadContracts();
  const reasonHash  = ethers.keccak256(ethers.toUtf8Bytes(reason));
  const tradeDir    = direction === "AVALANCHE_TO_KITE" ? "BUY" : "SELL";

  const tx      = await journal.logTrade(
    asset,
    tradeDir,
    BigInt(100 * 1e6),
    BigInt(Math.round(price * 1e8)),
    reasonHash
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, reasonHash };
}

// ── Settle arb outcome 10 minutes later ───────────────────
async function settleArbOutcome(
  agentWallet: string,
  opportunity: ArbOpportunity
): Promise<void> {
  await new Promise(r => setTimeout(r, 10 * 60 * 1000));

  try {
    const { registry } = loadContracts();

    const currentAvax   = await getAvalanchePrice(opportunity.asset);
    const currentSpread = Math.abs(currentAvax.price - opportunity.avalanchePrice);
    const spreadChanged = currentSpread - opportunity.spreadUSD;

    // Profitable opps: won if spread held or widened; non-profitable opps: always lost
    const won    = opportunity.profitable ? spreadChanged >= 0 : false;
    const pnlBps = opportunity.profitable
      ? Math.round((spreadChanged / opportunity.avalanchePrice) * 10000)
      : 0;

    console.log(`[Arb Settlement] ${opportunity.asset}`);
    console.log(`   Entry spread: $${opportunity.spreadUSD.toFixed(2)}`);
    console.log(`   Exit spread:  $${currentSpread.toFixed(2)}`);
    console.log(`   Result: ${won ? "✅ WON" : "❌ LOST"} (${pnlBps} bps)`);

    const tx = await registry.recordTrade(agentWallet, won, BigInt(pnlBps));
    await tx.wait();
    console.log("[Arb Settlement] ✅ Reputation updated on Kite");

  } catch (err) {
    console.error("[Arb Settlement] Error:", err);
  }
}

export interface ArbCycleResult {
  asset:      string;
  direction:  "BUY" | "SELL";
  price:      number;
  reason:     string;
  reasonHash: string;
  txHash:     string;
}

export async function runArbCycle(
  agentId:     number,
  agentWallet: string
): Promise<ArbCycleResult[]> {
  console.log(`[Arb Agent ${agentId}] Scanning cross-chain opportunities...`);
  const results: ArbCycleResult[] = [];

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

      const { txHash, reasonHash } = await logArbOpportunity(
        asset,
        reason,
        opportunity.avalanchePrice,
        opportunity.direction
      );
      console.log(`[Arb Agent ${agentId}] ✅ Logged on Kite: ${txHash}`);

      results.push({
        asset,
        direction: opportunity.direction === "AVALANCHE_TO_KITE" ? "BUY" : "SELL",
        price:     opportunity.avalanchePrice,
        reason,
        reasonHash,
        txHash,
      });

      settleArbOutcome(agentWallet, opportunity).catch(err =>
        console.error(`[Arb Agent ${agentId}] Settlement error:`, err)
      );

    } catch (err) {
      console.error(`[Arb Agent ${agentId}] Error scanning ${asset}:`, err);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}
