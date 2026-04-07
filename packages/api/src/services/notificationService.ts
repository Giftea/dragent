import TelegramBot from "node-telegram-bot-api";
import { query } from "../db";

const bot = process.env.TELEGRAM_BOT_TOKEN
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  : null;

// ── Send trade notification ───────────────────────────────
export async function notifyTrade(params: {
  agentId: number;
  asset: string;
  direction: "BUY" | "SELL";
  sizeUSDC: number;
  price: number;
  reason: string;
  reasonHash: string;
  txHash: string;
}) {
  if (!bot) return;

  // Get user's telegram chat ID from DB
  const result = await query(
    `SELECT u.telegram_chat_id 
     FROM users u
     JOIN agents a ON a.user_id = u.id
     WHERE a.id = $1`,
    [params.agentId],
  );

  const chatId = result.rows[0]?.telegram_chat_id;
  if (!chatId) return;

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
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

// ── Send agent status notification ────────────────────────
export async function notifyAgentStatus(
  agentId: number,
  status: "started" | "paused" | "circuit-breaker",
) {
  if (!bot) return;

  const result = await query(
    `SELECT u.telegram_chat_id 
     FROM users u
     JOIN agents a ON a.user_id = u.id
     WHERE a.id = $1`,
    [agentId],
  );

  const chatId = result.rows[0]?.telegram_chat_id;
  if (!chatId) return;

  const messages = {
    started: "🚀 Your Dragent agent is now active and scanning markets.",
    paused: "⏸ Your Dragent agent has been paused.",
    "circuit-breaker":
      "⚠️ Circuit breaker triggered — your agent has been paused due to drawdown limit. Check your dashboard.",
  };

  try {
    await bot.sendMessage(chatId, messages[status]);
  } catch (err) {
    console.error("Telegram status notification failed:", err);
  }
}

// ── Register a user's chat ID ─────────────────────────────
export async function registerTelegramChat(
  walletAddress: string,
  chatId: number,
) {
  await query("UPDATE users SET telegram_chat_id = $1 WHERE wallet = $2", [
    chatId,
    walletAddress.toLowerCase(),
  ]);
}
