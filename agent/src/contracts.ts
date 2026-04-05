import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

// ── Provider + Signer ─────────────────────────────────────
export const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
export const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// ── Load ABIs from compiled artifacts ─────────────────────
function loadAbi(contractName: string) {
  const artifactPath = path.resolve(
    __dirname,
    `../../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
}

// ── Contract instances ────────────────────────────────────
export const tradeJournal = new ethers.Contract(
  process.env.TRADE_JOURNAL_ADDRESS!,
  loadAbi("TradeJournal"),
  wallet
);

export const reputationRegistry = new ethers.Contract(
  process.env.REPUTATION_REGISTRY_ADDRESS!,
  loadAbi("ReputationRegistry"),
  wallet
);

export const agentVault = new ethers.Contract(
  process.env.AGENT_VAULT_ADDRESS!,
  loadAbi("AgentVault"),
  wallet
);

// ── Helper: check agent is not paused ─────────────────────
export async function isAgentPaused(): Promise<boolean> {
  return await agentVault.isPaused();
}

// ── Helper: get current budget remaining ──────────────────
export async function getRemainingBudget(): Promise<bigint> {
  return await agentVault.getRemainingDailyBudget();
}

// ── Helper: get agent reputation tier ─────────────────────
export async function getAgentTier(): Promise<number> {
  return await reputationRegistry.getTier(wallet.address);
}

console.log("✅ Contracts loaded");
console.log("   TradeJournal:       ", process.env.TRADE_JOURNAL_ADDRESS);
console.log("   ReputationRegistry: ", process.env.REPUTATION_REGISTRY_ADDRESS);
console.log("   AgentVault:         ", process.env.AGENT_VAULT_ADDRESS);
console.log("   Agent wallet:       ", wallet.address);