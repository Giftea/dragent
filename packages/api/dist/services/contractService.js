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
exports.reputationRegistry = exports.tradeJournal = exports.factory = void 0;
exports.deployUserVault = deployUserVault;
exports.getAgentStats = getAgentStats;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const core_1 = require("@dragent/core");
dotenv.config();
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
const deployer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
exports.factory = new ethers_1.ethers.Contract(process.env.AGENT_VAULT_FACTORY_ADDRESS, core_1.AGENT_VAULT_FACTORY_ABI, deployer);
exports.tradeJournal = new ethers_1.ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS, core_1.TRADE_JOURNAL_ABI, deployer);
exports.reputationRegistry = new ethers_1.ethers.Contract(process.env.REPUTATION_REGISTRY_ADDRESS, core_1.REPUTATION_REGISTRY_ABI, deployer);
// Deploy a vault for a new user via the factory
async function deployUserVault(agentWallet, maxDrawdownBps = 1000, maxPositionSizeBps = 200, maxDailySpendUSDC = 100 * 1e6, cooldownSeconds = 3600) {
    try {
        const tx = await exports.factory.createVault(agentWallet, maxDrawdownBps, maxPositionSizeBps, BigInt(maxDailySpendUSDC), cooldownSeconds);
        const receipt = await tx.wait();
        const event = receipt.logs
            .map((log) => {
            try {
                return exports.factory.interface.parseLog(log);
            }
            catch {
                return null;
            }
        })
            .find((e) => e?.name === "VaultCreated");
        return event?.args?.vault;
    }
    catch (err) {
        // If vault already exists, look it up from the factory
        const reason = err.reason;
        if (reason === "Vault already exists") {
            console.log("Vault already exists — looking up existing vault...");
            const existingVault = await exports.factory.getVault(new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY).address);
            if (existingVault && existingVault !== ethers_1.ethers.ZeroAddress) {
                console.log("Found existing vault:", existingVault);
                return existingVault;
            }
        }
        throw err;
    }
}
// Get on-chain stats for an agent
async function getAgentStats(agentAddress) {
    const [stats, tier, budgetLimit] = await Promise.all([
        exports.reputationRegistry.getStats(agentAddress),
        exports.reputationRegistry.getTier(agentAddress),
        exports.reputationRegistry.getBudgetLimit(agentAddress),
    ]);
    return {
        totalTrades: Number(stats.totalTrades),
        winCount: Number(stats.winCount),
        winRateBps: Number(stats.winRateBps),
        maxDrawdownBps: Number(stats.maxDrawdownBps),
        tier: Number(tier),
        budgetLimit: budgetLimit.toString(),
    };
}
