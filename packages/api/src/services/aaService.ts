import { GokiteAASDK } from "gokite-aa-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const KITE_RPC = process.env.KITE_RPC!;
const BUNDLER_RPC = "https://bundler-service.staging.gokite.ai/rpc/";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// ── Initialize AA SDK ─────────────────────────────────────
export const sdk = new GokiteAASDK("kite_testnet", KITE_RPC, BUNDLER_RPC);

export const provider = new ethers.JsonRpcProvider(KITE_RPC);
export const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ── Sign function for UserOperations ──────────────────────
export const signFunction = async (userOpHash: string): Promise<string> => {
  return signer.signMessage(ethers.getBytes(userOpHash));
};

// ── Get or compute AA wallet address for a signer ─────────
export function getAAWalletAddress(signerAddress: string): string {
  return sdk.getAccountAddress(signerAddress);
}

export async function getAAWalletBalance(
  signerAddress: string,
): Promise<string> {
  const aaWallet = getAAWalletAddress(signerAddress);
  const balance = await provider.getBalance(aaWallet);
  return ethers.formatEther(balance);
}

// ── Send a single UserOperation ───────────────────────────
export async function sendUserOp(
  signerAddress: string,
  target: string,
  callData: string,
  value: bigint = 0n,
): Promise<{ txHash: string; success: boolean }> {
  const result = await sdk.sendUserOperationAndWait(
    signerAddress,
    { target, value, callData },
    signFunction,
  );

  if (result.status.status === "success" && result.status.transactionHash) {
    console.log("✅ UserOp success:", result.status.transactionHash);
    return { txHash: result.status.transactionHash, success: true };
  } else {
    console.error("❌ UserOp failed:", result.status.reason);
    throw new Error(`UserOp failed: ${result.status.reason ?? "unknown"}`);
  }
}

export async function sendBatchUserOp(
  signerAddress: string,
  operations: {
    target: string;
    callData: string;
    value?: bigint;
  }[],
): Promise<{ txHash: string; success: boolean }> {
  const result = await sdk.sendUserOperationAndWait(
    signerAddress,
    {
      targets: operations.map((op) => op.target),
      callDatas: operations.map((op) => op.callData),
      values: operations.map((op) => op.value ?? 0n),
    },
    signFunction,
  );

  if (result.status.status === "success" && result.status.transactionHash) {
    console.log("✅ Batch UserOp success:", result.status.transactionHash);
    return { txHash: result.status.transactionHash, success: true };
  } else {
    console.error("❌ Batch UserOp failed:", result.status.reason);
    throw new Error(
      `Batch UserOp failed: ${result.status.reason ?? "unknown"}`,
    );
  }
}

// ── Deploy ClientAgentVault via AA SDK ────────────────────
export async function deployAgentVaultAA(
  signerAddress: string,
  settlementToken: string,
): Promise<string> {
  const aaWallet = getAAWalletAddress(signerAddress);

  console.log(`🏦 Deploying ClientAgentVault for ${signerAddress}`);
  console.log(`   AA Wallet: ${aaWallet}`);

  // Encode the vault creation call
  const vaultInterface = new ethers.Interface([
    "function performCreate(address settlementToken) returns (address)",
  ]);

  const callData = vaultInterface.encodeFunctionData("performCreate", [
    settlementToken,
  ]);

  const result = await sendUserOp(signerAddress, aaWallet, callData);
  console.log(`✅ Vault deployed via AA SDK: ${result.txHash}`);

  return aaWallet;
}

// ── Configure spending rules via AA SDK ───────────────────
export async function configureSpendingRules(
  signerAddress: string,
  vaultAddress: string,
  budgetUSDC: number,
  timeWindow: number = 86400, // 24 hours
): Promise<void> {
  const startTimestamp = BigInt(Math.floor(Date.now() / 1000));

  const vaultInterface = new ethers.Interface([
    "function configureSpendingRules((uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] targetProviders)[] rules)",
  ]);

  const rules = [
    {
      timeWindow: BigInt(timeWindow),
      budget: ethers.parseUnits(budgetUSDC.toString(), 18),
      initialWindowStartTime: startTimestamp,
      targetProviders: [] as string[],
    },
  ];

  const callData = vaultInterface.encodeFunctionData("configureSpendingRules", [
    rules,
  ]);

  await sendUserOp(signerAddress, vaultAddress, callData);
  console.log(
    `✅ Spending rules configured: $${budgetUSDC} per ${timeWindow}s`,
  );
}

// ── Log trade via AA SDK (batch: authorize + log) ─────────
export async function logTradeViaAA(
  signerAddress: string,
  tradeJournalAddr: string,
  asset: string,
  direction: string,
  sizeUSDC: bigint,
  priceUSD: bigint,
  reasonHash: string,
): Promise<{ txHash: string }> {
  const journalInterface = new ethers.Interface([
    "function logTrade(string asset, string direction, uint256 sizeUSDC, uint256 priceUSD, bytes32 reasonHash) returns (uint256)",
  ]);

  const callData = journalInterface.encodeFunctionData("logTrade", [
    asset,
    direction,
    sizeUSDC,
    priceUSD,
    reasonHash,
  ]);

  const result = await sendUserOp(signerAddress, tradeJournalAddr, callData);

  return { txHash: result.txHash };
}

// ── Get AA wallet balance ──────────────────
