// import { Router } from "express";
// import { requirePayment } from "../middleware/x402";
// import Anthropic from "@anthropic-ai/sdk";

// const router = Router();
// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// // POST /api/strategy/parse
// router.post(
//   "/parse",
//   requirePayment("100000", "Strategy parsing — 0.10 PYUSD"),
//   async (req, res) => {
//     try {
//       const { strategy } = req.body;
//       if (!strategy)
//         return res.status(400).json({ error: "strategy required" });

//       const message = await anthropic.messages.create({
//         model: "claude-sonnet-4-20250514",
//         max_tokens: 1024,
//         messages: [
//           {
//             role: "user",
//             content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

// Strategy: "${strategy}"

// Supported assets: ETH, BTC, SOL, AVAX, BNB, ARB

// Return ONLY valid JSON, no explanation, no markdown:
// {
//   "entryConditions": {
//     "rsiBelow": <number or null>,
//     "rsiAbove": <number or null>,
//     "priceChangePct": <number or null>,
//     "trendRequired": <"bullish"|"bearish"|"neutral"|null>,
//     "minConfidence": <number 0-100>
//   },
//   "riskRules": {
//     "maxRiskPctPerTrade": <number, default 2>,
//     "maxDrawdownPct": <number, default 10>,
//     "stopLossPct": <number, default 5>,
//     "takeProfitPct": <number, default 10>
//   },
//   "assets": [<array of symbols from supported assets list>],
//   "direction": <"long"|"short"|"both">
// }`,
//           },
//         ],
//       });

//       const raw = (message.content[0] as { text: string }).text.trim();
//       const rules = JSON.parse(raw);

//       return res.json({ rules });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Failed to parse strategy" });
//     }
//   },
// );

// // POST /api/reason/generate — 0.05 PYUSD (new paid endpoint)
// router.post(
//   "/reason/generate",
//   requirePayment("50000", "Trade reason generation — 0.05 PYUSD"),
//   async (req, res) => {
//     try {
//       const {
//         asset,
//         price,
//         rsi,
//         priceChange4h,
//         trend,
//         confidence,
//         strategy,
//         action,
//         sizeUSDC,
//       } = req.body;

//       if (!asset || !price || !rsi || !action || !strategy) {
//         return res.status(400).json({ error: "Missing required fields" });
//       }

//       const message = await anthropic.messages.create({
//         model: "claude-sonnet-4-20250514",
//         max_tokens: 256,
//         messages: [
//           {
//             role: "user",
//             content: `You are an autonomous AI trading agent. Write one clear sentence explaining why you are making this trade. Be specific with numbers. Do not question or contradict the trade decision.

// Trade: ${action} ${asset} worth $${sizeUSDC} USDC
// Market data:
// - Current price: $${price}
// - RSI: ${rsi}
// - 4h price change: ${priceChange4h}%
// - Trend: ${trend} (${confidence}% confidence)

// Strategy: "${strategy}"

// Write ONE sentence starting with "${
//               action === "BUY" ? "Buying" : "Selling"
//             }". No preamble, just the sentence.`,
//           },
//         ],
//       });

//       const reason = (message.content[0] as { text: string }).text.trim();
//       const { ethers } = await import("ethers");
//       const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

//       return res.json({ reason, reasonHash });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json({ error: "Failed to generate reason" });
//     }
//   },
// );

// export default router;
import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requirePayment } from "../middleware/x402";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// POST /api/strategy/parse — 0.10 PYUSD
router.post(
  "/parse",
  requirePayment(
    "1000000000000000000",
    "Strategy parsing — powered by Claude AI",
    "/api/strategy/parse",
  ),
  async (req, res) => {
    try {
      const { strategy } = req.body;
      if (!strategy)
        return res.status(400).json({ error: "strategy required" });

      let lastError: unknown;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

Strategy: "${strategy}"

Supported assets: ETH, BTC, SOL, AVAX, BNB, ARB

Return ONLY valid JSON, no explanation, no markdown:
{
  "entryConditions": {
    "rsiBelow": <number or null>,
    "rsiAbove": <number or null>,
    "priceChangePct": <number or null>,
    "trendRequired": <"bullish"|"bearish"|"neutral"|null>,
    "minConfidence": <number 0-100>
  },
  "riskRules": {
    "maxRiskPctPerTrade": <number, default 2>,
    "maxDrawdownPct": <number, default 10>,
    "stopLossPct": <number, default 5>,
    "takeProfitPct": <number, default 10>
  },
  "assets": [<array of symbols from supported assets list>],
  "direction": <"long"|"short"|"both">
}`,
              },
            ],
          });

          const raw = (message.content[0] as { text: string }).text.trim();
          const rules = JSON.parse(raw);
          return res.json({ rules });
        } catch (err: unknown) {
          lastError = err;
          const status = (err as { status?: number }).status;
          if (status === 529) {
            console.warn(`⚠️  Anthropic overloaded, retry ${attempt}/3...`);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          throw err;
        }
      }

      throw lastError;
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Failed to parse strategy. Try again shortly.",
      });
    }
  },
);

// POST /api/strategy/parse/internal — no payment required (for app UI)
router.post("/parse/internal", async (req, res) => {
  try {
    const { strategy } = req.body;
    if (!strategy) return res.status(400).json({ error: "strategy required" });

    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const message = await anthropic.messages.create({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

Strategy: "${strategy}"

Supported assets: ETH, BTC, SOL, AVAX, BNB, ARB

Return ONLY valid JSON, no explanation, no markdown:
{
  "entryConditions": {
    "rsiBelow": <number or null>,
    "rsiAbove": <number or null>,
    "priceChangePct": <number or null>,
    "trendRequired": <"bullish"|"bearish"|"neutral"|null>,
    "minConfidence": <number 0-100>
  },
  "riskRules": {
    "maxRiskPctPerTrade": <number, default 2>,
    "maxDrawdownPct": <number, default 10>,
    "stopLossPct": <number, default 5>,
    "takeProfitPct": <number, default 10>
  },
  "assets": [<array of symbols from supported assets list>],
  "direction": <"long"|"short"|"both">
}`
          }]
        });

        const raw   = (message.content[0] as { text: string }).text.trim();
        const rules = JSON.parse(raw);
        return res.json({ rules });

      } catch (err: unknown) {
        lastError    = err;
        const status = (err as { status?: number }).status;
        if (status === 529) {
          console.warn(`⚠️  Anthropic overloaded, retry ${attempt}/3...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw err;
      }
    }

    throw lastError;

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to parse strategy. Try again shortly." });
  }
});

// POST /api/reason/generate — 0.05 PYUSD
router.post(
  "/reason/generate",
  requirePayment(
    "500000000000000000",
    "Trade reason generation — powered by Claude AI",
    "/api/reason/generate",
  ),
  async (req, res) => {
    try {
      const {
        asset,
        price,
        rsi,
        priceChange4h,
        trend,
        confidence,
        strategy,
        action,
        sizeUSDC,
      } = req.body;

      if (!asset || !price || !rsi || !action || !strategy) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let lastError: unknown;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const message = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 256,
            messages: [
              {
                role: "user",
                content: `You are an autonomous AI trading agent. Write one clear sentence explaining why you are making this trade. Be specific with numbers. Do not question or contradict the trade decision.

Trade: ${action} ${asset} worth $${sizeUSDC} USDC
Market data:
- Current price: $${price}
- RSI: ${rsi}
- 4h price change: ${priceChange4h}%
- Trend: ${trend} (${confidence}% confidence)

Strategy: "${strategy}"

Write ONE sentence starting with "${
                  action === "BUY" ? "Buying" : "Selling"
                }". No preamble, just the sentence.`,
              },
            ],
          });

          const reason = (message.content[0] as { text: string }).text.trim();
          const { ethers } = await import("ethers");
          const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));

          return res.json({ reason, reasonHash });
        } catch (err: unknown) {
          lastError = err;
          const status = (err as { status?: number }).status;
          if (status === 529) {
            console.warn(`⚠️  Anthropic overloaded, retry ${attempt}/3...`);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          throw err;
        }
      }

      throw lastError;
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: "Failed to generate reason. Try again shortly.",
      });
    }
  },
);

export default router;
