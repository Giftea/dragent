import { getAvalanchePrice, getKitePrice } from "../perception/avalancheData";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const BRIDGE_FEE_USD = 0.50;  // conservative LayerZero Avalanche → Kite estimate
const MIN_PROFIT_USD = 1.00;
const SLIPPAGE_BPS   = 30;    // 0.3% slippage assumption

export interface ArbOpportunity {
  asset:           string;
  avalanchePrice:  number;
  kitePrice:       number;
  spreadUSD:       number;
  spreadBps:       number;
  bridgeFeeUSD:    number;
  estimatedProfit: number;
  direction:       "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE";
  profitable:      boolean;
  reason:          string;
  confidence:      number;
  timestamp:       number;
}

export async function detectArbOpportunity(asset: string): Promise<ArbOpportunity> {
  const [avaxPrice, kitePrice] = await Promise.all([
    getAvalanchePrice(asset),
    getKitePrice(asset),
  ]);

  const spread    = Math.abs(avaxPrice.price - kitePrice.price);
  const spreadBps = Math.round((spread / avaxPrice.price) * 10000);

  const direction: "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE" =
    kitePrice.price > avaxPrice.price
      ? "AVALANCHE_TO_KITE"   // buy on Avalanche, sell on Kite
      : "KITE_TO_AVALANCHE";  // buy on Kite, sell on Avalanche

  const positionSize    = 100;
  const slippageCost    = (positionSize * SLIPPAGE_BPS) / 10000;
  const grossProfit     = (spread / avaxPrice.price) * positionSize;
  const estimatedProfit = grossProfit - BRIDGE_FEE_USD - slippageCost;
  const profitable      = estimatedProfit > MIN_PROFIT_USD;

  const confidence = profitable
    ? Math.min(90, 50 + spreadBps / 2)
    : Math.max(10, 30 - (MIN_PROFIT_USD - estimatedProfit) * 10);

  return {
    asset,
    avalanchePrice:  avaxPrice.price,
    kitePrice:       kitePrice.price,
    spreadUSD:       spread,
    spreadBps,
    bridgeFeeUSD:    BRIDGE_FEE_USD,
    estimatedProfit,
    direction,
    profitable,
    reason:          "",
    confidence:      Math.round(confidence),
    timestamp:       Date.now(),
  };
}

export async function generateArbReason(opp: ArbOpportunity): Promise<string> {
  const message = await anthropic.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{
      role:    "user",
      content: `You are an autonomous cross-chain arbitrage agent. Write one clear sentence describing this arbitrage opportunity. Be specific with numbers.

Opportunity:
- Asset: ${opp.asset}
- Avalanche price: $${opp.avalanchePrice.toFixed(2)} (${opp.direction === "AVALANCHE_TO_KITE" ? "BUY here" : "SELL here"})
- Kite chain price: $${opp.kitePrice.toFixed(2)} (${opp.direction === "AVALANCHE_TO_KITE" ? "SELL here" : "BUY here"})
- Price spread: $${opp.spreadUSD.toFixed(2)} (${opp.spreadBps} bps)
- Bridge fee: $${opp.bridgeFeeUSD}
- Estimated profit on $100 position: $${opp.estimatedProfit.toFixed(2)}
- Profitable: ${opp.profitable ? "YES" : "NO — spread too small after fees"}

Write ONE sentence starting with "${opp.profitable ? "Cross-chain arb opportunity" : "Monitoring cross-chain spread"}". Be factual, cite the prices and spread. No preamble.`,
    }],
  });

  return (message.content[0] as { text: string }).text.trim();
}
