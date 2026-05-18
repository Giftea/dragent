"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTrade = notifyTrade;
exports.notifyAgentStatus = notifyAgentStatus;
exports.registerTelegramChat = registerTelegramChat;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const db_1 = require("../db");
const bot = process.env.TELEGRAM_BOT_TOKEN
    ? new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
    : null;
// ── Send trade notification ───────────────────────────────
async function notifyTrade(params) {
    if (!bot)
        return;
    // Get user's telegram chat ID from DB
    const result = await (0, db_1.query)(`SELECT u.telegram_chat_id 
     FROM users u
     JOIN agents a ON a.user_id = u.id
     WHERE a.id = $1`, [params.agentId]);
    const chatId = result.rows[0]?.telegram_chat_id;
    if (!chatId)
        return;
    const emoji = params.direction === "BUY" ? "🟢" : "🔴";
    const explorerUrl = `https://testnet.kitescan.ai/tx/${params.txHash}`;
    const message = `
${emoji} *Dragent Trade Alert*

*${params.direction} ${params.asset}*
Size: $${params.sizeUSDC} USDC @ $${params.price.toLocaleString()}

*Reasoning:*
_${params.reason}_

*Verified on Kite:*
\`${params.reasonHash.slice(0, 20)}...\`

[View transaction](${explorerUrl})
`.trim();
    try {
        await bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        });
        console.log(`📱 Telegram notification sent to agent ${params.agentId}`);
    }
    catch (err) {
        console.error("Telegram notification failed:", err);
    }
}
// ── Send agent status notification ────────────────────────
async function notifyAgentStatus(agentId, status) {
    if (!bot)
        return;
    const result = await (0, db_1.query)(`SELECT u.telegram_chat_id 
     FROM users u
     JOIN agents a ON a.user_id = u.id
     WHERE a.id = $1`, [agentId]);
    const chatId = result.rows[0]?.telegram_chat_id;
    if (!chatId)
        return;
    const messages = {
        started: "🚀 Your Dragent agent is now active and scanning markets.",
        paused: "⏸ Your Dragent agent has been paused.",
        "circuit-breaker": "⚠️ Circuit breaker triggered — your agent has been paused due to drawdown limit. Check your dashboard.",
    };
    try {
        await bot.sendMessage(chatId, messages[status]);
    }
    catch (err) {
        console.error("Telegram status notification failed:", err);
    }
}
// ── Register a user's chat ID ─────────────────────────────
async function registerTelegramChat(walletAddress, chatId) {
    await (0, db_1.query)("UPDATE users SET telegram_chat_id = $1 WHERE wallet = $2", [
        chatId,
        walletAddress.toLowerCase(),
    ]);
}
