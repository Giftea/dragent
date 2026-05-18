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
exports.runAllocationCycle = runAllocationCycle;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const allocationAgent_1 = require("./allocationAgent");
const abis_1 = require("../abis");
dotenv.config();
function loadTradeJournal() {
    const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
    const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
    return new ethers_1.ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS, abis_1.TRADE_JOURNAL_ABI, wallet);
}
async function runAllocationCycle(agentId) {
    console.log(`[Allocation Agent ${agentId}] Analysing DeFi yields...`);
    try {
        const decision = await (0, allocationAgent_1.analyzeAllocation)("medium", "USDC");
        if (!decision) {
            console.log(`[Allocation Agent ${agentId}] No suitable allocation found`);
            return null;
        }
        const { recommended, reason } = decision;
        const protocol = recommended.protocol.replace(/-/g, " ");
        const asset = `${recommended.asset.split("-")[0]}-${protocol}`;
        const journal = loadTradeJournal();
        const reasonHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(reason));
        console.log(`[Allocation Agent ${agentId}] Best yield: ${recommended.protocol}`);
        console.log(`   APY: ${recommended.apy}%`);
        console.log(`   Chain: ${recommended.chain}`);
        console.log(`   Risk: ${recommended.risk}`);
        console.log(`   Reason: "${reason}"`);
        const tx = await journal.logTrade(asset, "BUY", BigInt(100 * 1e6), BigInt(Math.round(recommended.apy * 1e8)), reasonHash);
        const receipt = await tx.wait();
        console.log(`[Allocation Agent ${agentId}] ✅ Allocation logged on Kite: ${receipt.hash}`);
        return { txHash: receipt.hash, reasonHash, reason, asset, apy: recommended.apy };
    }
    catch (err) {
        console.error(`[Allocation Agent ${agentId}] Error:`, err);
        return null;
    }
}
