"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretStrategy = interpretStrategy;
exports.evaluateSignal = evaluateSignal;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
// ── Parse natural language strategy → TradingRules ────────
async function interpretStrategy(naturalLanguageStrategy) {
    const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: `You are a trading strategy parser. Convert this natural language trading strategy into a structured JSON object.

Strategy: "${naturalLanguageStrategy}"

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
    const raw = message.content[0].text.trim();
    return JSON.parse(raw);
}
// ── Evaluate: does current signal match the rules? ────────
function evaluateSignal(signal, rules) {
    const ec = rules.entryConditions;
    // Check asset is in scope
    if (!rules.assets.includes(signal.asset)) {
        return {
            shouldTrade: false,
            action: "HOLD",
            reason: `${signal.asset} not in strategy scope`,
        };
    }
    // Check minimum confidence
    if (ec.minConfidence && signal.confidence < ec.minConfidence) {
        return {
            shouldTrade: false,
            action: "HOLD",
            reason: `Confidence ${signal.confidence} below threshold ${ec.minConfidence}`,
        };
    }
    // Check RSI buy condition
    if (ec.rsiBelow && signal.rsi < ec.rsiBelow && rules.direction !== "short") {
        return {
            shouldTrade: true,
            action: "BUY",
            reason: `RSI at ${signal.rsi} is below threshold ${ec.rsiBelow}. Price changed ${signal.priceChange4h}% in 4h. Trend is ${signal.trend} with ${signal.confidence}% confidence.`,
        };
    }
    // Check RSI sell condition
    if (ec.rsiAbove && signal.rsi > ec.rsiAbove && rules.direction !== "long") {
        return {
            shouldTrade: true,
            action: "SELL",
            reason: `RSI at ${signal.rsi} is above threshold ${ec.rsiAbove}. Price changed ${signal.priceChange4h}% in 4h. Trend is ${signal.trend} with ${signal.confidence}% confidence.`,
        };
    }
    // Check trend condition
    if (ec.trendRequired && signal.trend !== ec.trendRequired) {
        return {
            shouldTrade: false,
            action: "HOLD",
            reason: `Trend is ${signal.trend}, strategy requires ${ec.trendRequired}`,
        };
    }
    return {
        shouldTrade: false,
        action: "HOLD",
        reason: `No entry conditions met. RSI: ${signal.rsi}, Trend: ${signal.trend}`,
    };
}
