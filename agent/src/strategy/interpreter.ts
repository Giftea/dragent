import Anthropic from "@anthropic-ai/sdk";
import { MarketSignal } from "../perception/marketData";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Rule schema ───────────────────────────────────────────
export interface TradingRules {
  entryConditions: {
    rsiBelow?:         number;   // buy when RSI < this
    rsiAbove?:         number;   // sell when RSI > this
    priceChangePct?:   number;   // trigger on % move
    trendRequired?:    "bullish" | "bearish" | "neutral";
    minConfidence?:    number;   // 0–100
  };
  riskRules: {
    maxRiskPctPerTrade: number;  // % of balance per trade
    maxDrawdownPct:     number;  // stop trading if drawdown exceeds
    stopLossPct:        number;  // exit position at this loss
    takeProfitPct:      number;  // exit position at this gain
  };
  assets: string[];              // which assets to trade
  direction: "long" | "short" | "both";
}

// ── Parse natural language strategy → TradingRules ────────
export async function interpretStrategy(
  naturalLanguageStrategy: string
): Promise<TradingRules> {
  const message = await anthropic.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

Strategy: "${naturalLanguageStrategy}"

Return ONLY a valid JSON object with this exact structure, no explanation:
{
  "entryConditions": {
    "rsiBelow": <number or null>,
    "rsiAbove": <number or null>,
    "priceChangePct": <number or null>,
    "trendRequired": <"bullish" | "bearish" | "neutral" | null>,
    "minConfidence": <number 0-100>
  },
  "riskRules": {
    "maxRiskPctPerTrade": <number, default 2>,
    "maxDrawdownPct": <number, default 10>,
    "stopLossPct": <number, default 5>,
    "takeProfitPct": <number, default 10>
  },
  "assets": [<array of asset symbols like "ETH", "BTC">],
  "direction": <"long" | "short" | "both">
}`
      }
    ]
  });

  const raw = (message.content[0] as { text: string }).text.trim();
  return JSON.parse(raw) as TradingRules;
}

// ── Evaluate: does current signal match the rules? ────────
export function evaluateSignal(
  signal: MarketSignal,
  rules:  TradingRules
): { shouldTrade: boolean; action: "BUY" | "SELL" | "HOLD"; reason: string } {

  const ec = rules.entryConditions;

  // Check asset is in scope
  if (!rules.assets.includes(signal.asset)) {
    return { shouldTrade: false, action: "HOLD", reason: `${signal.asset} not in strategy scope` };
  }

  // Check minimum confidence
  if (ec.minConfidence && signal.confidence < ec.minConfidence) {
    return { shouldTrade: false, action: "HOLD", reason: `Confidence ${signal.confidence} below threshold ${ec.minConfidence}` };
  }

  // Check RSI buy condition
  if (ec.rsiBelow && signal.rsi < ec.rsiBelow && rules.direction !== "short") {
    return {
      shouldTrade: true,
      action:      "BUY",
      reason: `RSI at ${signal.rsi} is below threshold ${ec.rsiBelow}. Price changed ${signal.priceChange4h}% in 4h. Trend is ${signal.trend} with ${signal.confidence}% confidence.`
    };
  }

  // Check RSI sell condition
  if (ec.rsiAbove && signal.rsi > ec.rsiAbove && rules.direction !== "long") {
    return {
      shouldTrade: true,
      action:      "SELL",
      reason: `RSI at ${signal.rsi} is above threshold ${ec.rsiAbove}. Price changed ${signal.priceChange4h}% in 4h. Trend is ${signal.trend} with ${signal.confidence}% confidence.`
    };
  }

  // Check trend condition
  if (ec.trendRequired && signal.trend !== ec.trendRequired) {
    return { shouldTrade: false, action: "HOLD", reason: `Trend is ${signal.trend}, strategy requires ${ec.trendRequired}` };
  }

  return { shouldTrade: false, action: "HOLD", reason: `No entry conditions met. RSI: ${signal.rsi}, Trend: ${signal.trend}` };
}