"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.signFunction = exports.signer = exports.provider = exports.sdk = void 0;
exports.getAAWalletAddress = getAAWalletAddress;
exports.getAAWalletBalance = getAAWalletBalance;
exports.sendUserOp = sendUserOp;
exports.sendBatchUserOp = sendBatchUserOp;
exports.deployAgentVaultAA = deployAgentVaultAA;
exports.configureSpendingRules = configureSpendingRules;
exports.logTradeViaAA = logTradeViaAA;
const gokite_aa_sdk_1 = require("gokite-aa-sdk");
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const KITE_RPC = process.env.KITE_RPC;
const BUNDLER_RPC = "https://bundler-service.staging.gokite.ai/rpc/";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// ── Initialize AA SDK ─────────────────────────────────────
exports.sdk = new gokite_aa_sdk_1.GokiteAASDK("kite_testnet", KITE_RPC, BUNDLER_RPC);
exports.provider = new ethers_1.ethers.JsonRpcProvider(KITE_RPC);
exports.signer = new ethers_1.ethers.Wallet(PRIVATE_KEY, exports.provider);
// ── Sign function for UserOperations ──────────────────────
const signFunction = async (userOpHash) => {
    return exports.signer.signMessage(ethers_1.ethers.getBytes(userOpHash));
};
exports.signFunction = signFunction;
// ── Get or compute AA wallet address for a signer ─────────
function getAAWalletAddress(signerAddress) {
    return exports.sdk.getAccountAddress(signerAddress);
}
async function getAAWalletBalance(signerAddress) {
    const aaWallet = getAAWalletAddress(signerAddress);
    const balance = await exports.provider.getBalance(aaWallet);
    return ethers_1.ethers.formatEther(balance);
}
// ── Send a single UserOperation ───────────────────────────
async function sendUserOp(signerAddress, target, callData, value = 0n) {
    const result = await exports.sdk.sendUserOperationAndWait(signerAddress, { target, value, callData }, exports.signFunction);
    if (result.status.status === "success" && result.status.transactionHash) {
        console.log("✅ UserOp success:", result.status.transactionHash);
        return { txHash: result.status.transactionHash, success: true };
    }
    else {
        console.error("❌ UserOp failed:", result.status.reason);
        throw new Error(`UserOp failed: ${result.status.reason ?? "unknown"}`);
    }
}
async function sendBatchUserOp(signerAddress, operations) {
    const result = await exports.sdk.sendUserOperationAndWait(signerAddress, {
        targets: operations.map((op) => op.target),
        callDatas: operations.map((op) => op.callData),
        values: operations.map((op) => op.value ?? 0n),
    }, exports.signFunction);
    if (result.status.status === "success" && result.status.transactionHash) {
        console.log("✅ Batch UserOp success:", result.status.transactionHash);
        return { txHash: result.status.transactionHash, success: true };
    }
    else {
        console.error("❌ Batch UserOp failed:", result.status.reason);
        throw new Error(`Batch UserOp failed: ${result.status.reason ?? "unknown"}`);
    }
}
// ── Deploy ClientAgentVault via AA SDK ────────────────────
async function deployAgentVaultAA(signerAddress, settlementToken) {
    const aaWallet = getAAWalletAddress(signerAddress);
    console.log(`🏦 Deploying ClientAgentVault for ${signerAddress}`);
    console.log(`   AA Wallet: ${aaWallet}`);
    // Encode the vault creation call
    const vaultInterface = new ethers_1.ethers.Interface([
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
async function configureSpendingRules(signerAddress, vaultAddress, budgetUSDC, timeWindow = 86400) {
    const startTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const vaultInterface = new ethers_1.ethers.Interface([
        "function configureSpendingRules((uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] targetProviders)[] rules)",
    ]);
    const rules = [
        {
            timeWindow: BigInt(timeWindow),
            budget: ethers_1.ethers.parseUnits(budgetUSDC.toString(), 18),
            initialWindowStartTime: startTimestamp,
            targetProviders: [],
        },
    ];
    const callData = vaultInterface.encodeFunctionData("configureSpendingRules", [
        rules,
    ]);
    await sendUserOp(signerAddress, vaultAddress, callData);
    console.log(`✅ Spending rules configured: $${budgetUSDC} per ${timeWindow}s`);
}
// ── Log trade via AA SDK (batch: authorize + log) ─────────
async function logTradeViaAA(signerAddress, tradeJournalAddr, asset, direction, sizeUSDC, priceUSD, reasonHash) {
    try {
        const journalInterface = new ethers_1.ethers.Interface([
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
    catch (err) {
        // AA SDK timed out or failed — fall back to direct transaction
        console.warn("⚠️  AA SDK failed, falling back to direct tx:", err);
        const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, exports.provider);
        const journal = new ethers_1.ethers.Contract(tradeJournalAddr, [
            "function logTrade(string,string,uint256,uint256,bytes32) returns (uint256)",
        ], wallet);
        const tx = await journal.logTrade(asset, direction, sizeUSDC, priceUSD, reasonHash);
        const receipt = await tx.wait();
        console.log(`✅ Fallback tx confirmed: ${receipt.hash}`);
        return { txHash: receipt.hash };
    }
}
// ── Get AA wallet balance ──────────────────
