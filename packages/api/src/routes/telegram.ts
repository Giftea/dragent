import { Router } from "express";
import TelegramBot from "node-telegram-bot-api";
import { registerTelegramChat } from "../services/notificationService";
import { query } from "../db";

const router = Router();

const bot = process.env.TELEGRAM_BOT_TOKEN
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
  : null;

if (bot) {
  // When user sends /start to the bot
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const walletAddress = match?.[1]?.trim();

    if (!walletAddress) {
      await bot.sendMessage(
        chatId,
        "Please provide your wallet address: /start 0xYourWalletAddress",
      );
      return;
    }

    // Check wallet exists in DB
    const result = await query("SELECT id FROM users WHERE wallet = $1", [
      walletAddress.toLowerCase(),
    ]);

    if (result.rows.length === 0) {
      await bot.sendMessage(
        chatId,
        "Wallet not found. Please deploy your agent on dragent.ai first.",
      );
      return;
    }

    await registerTelegramChat(walletAddress, chatId);

    await bot.sendMessage(
      chatId,
      `✅ Connected! You'll receive trade alerts for wallet ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}\n\nYour Dragent agent will notify you every time it makes a trade.`,
    );
  });

  // Handle plain /start with no wallet
  bot.onText(/^\/start$/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      "Welcome to Dragent! 🐉\n\nTo receive trade alerts, send:\n/start 0xYourWalletAddress",
    );
  });

  console.log("📱 Telegram bot polling started");
}

// POST /api/telegram/test — send a test notification
router.post("/test", async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const result = await query(
      "SELECT telegram_chat_id FROM users WHERE wallet = $1",
      [walletAddress?.toLowerCase()],
    );

    const chatId = result.rows[0]?.telegram_chat_id;
    if (!chatId || !bot) {
      return res.status(400).json({
        error: "No Telegram chat ID found. Send /start to the bot first.",
      });
    }

    await bot.sendMessage(
      chatId,
      "🐉 Dragent test notification — your alerts are working!",
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send test notification" });
  }
});

export default router;
