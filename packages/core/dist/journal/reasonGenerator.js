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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReason = generateReason;
exports.logTradeOnChain = logTradeOnChain;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const abis_1 = require("../abis");
dotenv.config();
// ── Provider + wallet ─────────────────────────────────────
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
const tradeJournal = new ethers_1.ethers.Contract(process.env.TRADE_JOURNAL_ADDRESS, abis_1.TRADE_JOURNAL_ABI, wallet);
const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
// ── Generate human-readable trade reason via Claude ───────
async function generateReason(signal, action, sizeUSDC, strategy) {
    const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
            {
                role: "user",
                content: `You are an autonomous AI trading agent. Write one clear sentence explaining why you are making this trade based purely on the market data provided. Be specific with numbers. Do not question or contradict the trade decision.

Trade: ${action} ${signal.asset} worth $${sizeUSDC} USDC
Market data:
- Current price: $${signal.price}
- RSI: ${signal.rsi}
- 4h price change: ${signal.priceChange4h}%
- Trend: ${signal.trend} (${signal.confidence}% confidence)
- Volume 24h: $${Math.round(signal.volume24h).toLocaleString()}

Strategy: "${strategy}"

Write ONE sentence starting with "${action === "BUY" ? "Buying" : "Selling"}". State the asset, price, and the specific market conditions that triggered this trade. No preamble, no hesitation, just the sentence.`
            }
        ]
    });
    return message.content[0].text
        .trim()
        .replace(/\*\*/g, "")
        .replace(/\*/g, "");
}
// ── Hash the reason and log it on Kite chain ──────────────
async function logTradeOnChain(signal, action, sizeUSDC, reason) {
    // Hash the plain-English reason
    const reasonHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(reason));
    // Submit to TradeJournal.sol on Kite
    const tx = await tradeJournal.logTrade(signal.asset, action, BigInt(Math.round(sizeUSDC * 1e6)), // USDC has 6 decimals
    BigInt(Math.round(signal.price * 1e8)), // price in 8 decimals
    reasonHash);
    const receipt = await tx.wait();
    // Parse TradeLogged event to get the tradeId
    const event = receipt.logs
        .map((log) => {
        try {
            return tradeJournal.interface.parseLog(log);
        }
        catch {
            return null;
        }
    })
        .find((e) => e?.name === "TradeLogged");
    const tradeId = event?.args?.tradeId ?? 0n;
    console.log(`📝 Trade logged on Kite`);
    console.log(`   Trade ID:    ${tradeId}`);
    console.log(`   Reason:      "${reason}"`);
    console.log(`   Reason hash: ${reasonHash}`);
    console.log(`   Tx:          https://testnet.kitescan.ai/tx/${receipt.hash}`);
    return { tradeId, reasonHash, txHash: receipt.hash };
}
