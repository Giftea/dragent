import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
const deployer  = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

function loadAbi(contractName: string) {
  const p = path.resolve(
    __dirname,
   `../../../contracts/artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

export const factory = new ethers.Contract(
  process.env.AGENT_VAULT_FACTORY_ADDRESS!,
  loadAbi("AgentVaultFactory"),
  deployer
);

export const tradeJournal = new ethers.Contract(
  process.env.TRADE_JOURNAL_ADDRESS!,
  loadAbi("TradeJournal"),
  deployer
);

export const reputationRegistry = new ethers.Contract(
  process.env.REPUTATION_REGISTRY_ADDRESS!,
  loadAbi("ReputationRegistry"),
  deployer
);

// Deploy a vault for a new user via the factory
export async function deployUserVault(
  agentWallet: string,
  maxDrawdownBps     = 1000,
  maxPositionSizeBps = 200,
  maxDailySpendUSDC  = 100 * 1e6,
  cooldownSeconds    = 3600
): Promise<string> {
  try {
    const tx = await factory.createVault(
      agentWallet,
      maxDrawdownBps,
      maxPositionSizeBps,
      BigInt(maxDailySpendUSDC),
      cooldownSeconds
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: { topics: string[]; data: string }) => {
        try { return factory.interface.parseLog(log); }
        catch { return null; }
      })
      .find((e: { name: string } | null) => e?.name === "VaultCreated");

    return event?.args?.vault;

  } catch (err: unknown) {
    // If vault already exists, look it up from the factory
    const reason = (err as { reason?: string }).reason;
    if (reason === "Vault already exists") {
      console.log("Vault already exists — looking up existing vault...");
      const existingVault = await factory.getVault(
        new ethers.Wallet(process.env.PRIVATE_KEY!).address
      );
      if (existingVault && existingVault !== ethers.ZeroAddress) {
        console.log("Found existing vault:", existingVault);
        return existingVault;
      }
    }
    throw err;
  }
}

// Get on-chain stats for an agent
export async function getAgentStats(agentAddress: string) {
  const [stats, tier, budgetLimit] = await Promise.all([
    reputationRegistry.getStats(agentAddress),
    reputationRegistry.getTier(agentAddress),
    reputationRegistry.getBudgetLimit(agentAddress),
  ]);

  return {
    totalTrades:    Number(stats.totalTrades),
    winCount:       Number(stats.winCount),
    winRateBps:     Number(stats.winRateBps),
    maxDrawdownBps: Number(stats.maxDrawdownBps),
    tier:           Number(tier),
    budgetLimit:    budgetLimit.toString(),
  };
}

// Get recent trades for an agent from chain
export async function getRecentTrades(agentAddress: string, n = 10) {
  const trades = await tradeJournal.getRecentTrades(agentAddress, n);
  return trades.map((t: {
    tradeId: bigint;
    agentId: string;
    timestamp: bigint;
    asset: string;
    direction: string;
    sizeUSDC: bigint;
    priceUSD: bigint;
    reasonHash: string;
  }) => ({
    tradeId:    Number(t.tradeId),
    agentId:    t.agentId,
    timestamp:  Number(t.timestamp),
    asset:      t.asset,
    direction:  t.direction,
    sizeUSDC:   Number(t.sizeUSDC) / 1e6,
    priceUSD:   Number(t.priceUSD) / 1e8,
    reasonHash: t.reasonHash,
  }));
}