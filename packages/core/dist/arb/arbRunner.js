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
exports.logArbOpportunity = logArbOpportunity;
exports.runArbCycle = runArbCycle;
const arbDetector_1 = require("./arbDetector");
const avalancheData_1 = require("../perception/avalancheData");
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const abis_1 = require("../abis");
dotenv.config();
const ARB_ASSETS = ["ETH", "BTC", "AVAX"];
function loadContracts() {
    const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
    const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const journal = new ethers_1.ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS, abis_1.TRADE_JOURNAL_ABI, wallet);
    const registry = new ethers_1.ethers.Contract(process.env.REPUTATION_REGISTRY_ADDRESS, abis_1.REPUTATION_REGISTRY_ABI, wallet);
    return { journal, registry, wallet };
}
async function logArbOpportunity(asset, reason, price, direction) {
    const { journal } = loadContracts();
    const reasonHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(reason));
    const tradeDir = direction === "AVALANCHE_TO_KITE" ? "BUY" : "SELL";
    const tx = await journal.logTrade(asset, tradeDir, BigInt(100 * 1e6), BigInt(Math.round(price * 1e8)), reasonHash);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, reasonHash };
}
// ── Settle arb outcome 10 minutes later ───────────────────
async function settleArbOutcome(agentWallet, opportunity) {
    if (!opportunity.profitable) {
        console.log(`[Arb Settlement] Skipping unprofitable scan for ${opportunity.asset}`);
        return;
    }
    await new Promise(r => setTimeout(r, 10 * 60 * 1000));
    try {
        const { registry } = loadContracts();
        const currentAvax = await (0, avalancheData_1.getAvalanchePrice)(opportunity.asset);
        const currentSpread = Math.abs(currentAvax.price - opportunity.avalanchePrice);
        const spreadChanged = currentSpread - opportunity.spreadUSD;
        // Profitable opps: won if spread held or widened; non-profitable opps: always lost
        const won = opportunity.profitable ? spreadChanged >= 0 : false;
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
    }
    catch (err) {
        console.error("[Arb Settlement] Error:", err);
    }
}
async function runArbCycle(agentId, agentWallet) {
    console.log(`[Arb Agent ${agentId}] Scanning cross-chain opportunities...`);
    const results = [];
    try {
        await (0, avalancheData_1.prefetchAllPrices)();
    }
    catch {
        console.warn(`[Arb Agent ${agentId}] Price prefetch failed, continuing...`);
    }
    for (const asset of ARB_ASSETS) {
        try {
            const opportunity = await (0, arbDetector_1.detectArbOpportunity)(asset);
            console.log(`[Arb Agent ${agentId}] ${asset}`);
            console.log(`   Avalanche: $${opportunity.avalanchePrice.toFixed(2)}`);
            console.log(`   Kite:      $${opportunity.kitePrice.toFixed(2)}`);
            console.log(`   Spread:    ${opportunity.spreadBps} bps ($${opportunity.spreadUSD.toFixed(2)})`);
            console.log(`   Profitable: ${opportunity.profitable ? "✅ YES" : "❌ NO"}`);
            const reason = await (0, arbDetector_1.generateArbReason)(opportunity);
            console.log(`   Reason: "${reason}"`);
            const { txHash, reasonHash } = await logArbOpportunity(asset, reason, opportunity.avalanchePrice, opportunity.direction);
            console.log(`[Arb Agent ${agentId}] ✅ Logged on Kite: ${txHash}`);
            results.push({
                asset,
                direction: opportunity.direction === "AVALANCHE_TO_KITE" ? "BUY" : "SELL",
                price: opportunity.avalanchePrice,
                reason,
                reasonHash,
                txHash,
            });
            settleArbOutcome(agentWallet, opportunity).catch(err => console.error(`[Arb Agent ${agentId}] Settlement error:`, err));
        }
        catch (err) {
            console.error(`[Arb Agent ${agentId}] Error scanning ${asset}:`, err);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    return results;
}
