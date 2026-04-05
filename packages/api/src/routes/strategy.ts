import { Router }            from "express";
import Anthropic             from "@anthropic-ai/sdk";

const router   = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// POST /api/strategy/parse
router.post("/parse", async (req, res) => {
  try {
    const { strategy } = req.body;
    if (!strategy) return res.status(400).json({ error: "strategy required" });

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

Strategy: "${strategy}"

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
  "assets": [<array of symbols like "ETH","BTC">],
  "direction": <"long"|"short"|"both">
}`
      }]
    });

    const raw   = (message.content[0] as { text: string }).text.trim();
    const rules = JSON.parse(raw);

    return res.json({ rules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to parse strategy" });
  }
});

export default router;