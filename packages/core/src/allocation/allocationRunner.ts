import { ethers }            from "ethers";
import * as path              from "path";
import * as fs                from "fs";
import * as dotenv            from "dotenv";
import { analyzeAllocation }  from "./allocationAgent";
dotenv.config();

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

export async function runAllocationCycle(agentId: number): Promise<void> {
  console.log(`[Allocation Agent ${agentId}] Analysing DeFi yields...`);

  try {
    const decision = await analyzeAllocation("medium", "USDC");

    if (!decision) {
      console.log(`[Allocation Agent ${agentId}] No suitable allocation found`);
      return;
    }

    const { recommended, reason } = decision;

    console.log(`[Allocation Agent ${agentId}] Best yield: ${recommended.protocol}`);
    console.log(`   APY: ${recommended.apy}%`);
    console.log(`   Chain: ${recommended.chain}`);
    console.log(`   Risk: ${recommended.risk}`);
    console.log(`   Reason: "${reason}"`);

    const journal    = loadTradeJournal();
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

    const tx = await journal.logTrade(
      `${recommended.asset}-${recommended.protocol}`,
      "BUY",
      BigInt(100 * 1e6),
      BigInt(Math.round(recommended.apy * 1e8)),
      reasonHash
    );

    const receipt = await tx.wait();
    console.log(`[Allocation Agent ${agentId}] ✅ Allocation logged on Kite: ${receipt.hash}`);

  } catch (err) {
    console.error(`[Allocation Agent ${agentId}] Error:`, err);
  }
}
