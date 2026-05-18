import { ethers }           from "ethers";
import * as dotenv           from "dotenv";
import { analyzeAllocation } from "./allocationAgent";
import { TRADE_JOURNAL_ABI } from "../abis";
dotenv.config();

function loadTradeJournal() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  return new ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS!, TRADE_JOURNAL_ABI, wallet);
}

export interface AllocationCycleResult {
  txHash:     string;
  reasonHash: string;
  reason:     string;
  asset:      string;
  apy:        number;
}

export async function runAllocationCycle(
  agentId: number
): Promise<AllocationCycleResult | null> {
  console.log(`[Allocation Agent ${agentId}] Analysing DeFi yields...`);

  try {
    const decision = await analyzeAllocation("medium", "USDC");

    if (!decision) {
      console.log(`[Allocation Agent ${agentId}] No suitable allocation found`);
      return null;
    }

    const { recommended, reason } = decision;
    const protocol   = recommended.protocol.replace(/-/g, " ");
    const asset      = `${recommended.asset.split("-")[0]}-${protocol}`;
    const journal    = loadTradeJournal();
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

    console.log(`[Allocation Agent ${agentId}] Best yield: ${recommended.protocol}`);
    console.log(`   APY: ${recommended.apy}%`);
    console.log(`   Chain: ${recommended.chain}`);
    console.log(`   Risk: ${recommended.risk}`);
    console.log(`   Reason: "${reason}"`);

    const tx      = await journal.logTrade(
      asset,
      "BUY",
      BigInt(100 * 1e6),
      BigInt(Math.round(recommended.apy * 1e8)),
      reasonHash
    );
    const receipt = await tx.wait();

    console.log(`[Allocation Agent ${agentId}] ✅ Allocation logged on Kite: ${receipt.hash}`);

    return { txHash: receipt.hash, reasonHash, reason, asset, apy: recommended.apy };

  } catch (err) {
    console.error(`[Allocation Agent ${agentId}] Error:`, err);
    return null;
  }
}
