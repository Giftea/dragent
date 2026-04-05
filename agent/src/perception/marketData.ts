import axios from "axios";

export interface MarketSignal {
  asset:          string;
  price:          number;
  rsi:            number;
  priceChange4h:  number;   // % change over 4 hours
  volume24h:      number;
  trend:          "bullish" | "bearish" | "neutral";
  confidence:     number;   // 0–100
  timestamp:      number;
}

// ── Fetch price + 4h change from CoinGecko (free, no key needed) ──
async function fetchPriceData(coinId: string): Promise<{
  price: number;
  change4h: number;
  volume24h: number;
}> {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price`,
    {
      params: {
        ids: coinId,
        vs_currencies: "usd",
        include_24hr_vol: true,
        include_24hr_change: true,
      },
    }
  );

  const data = res.data[coinId];
  return {
    price:    data.usd,
    change4h: data.usd_24h_change / 6, // approximate 4h from 24h
    volume24h: data.usd_24h_vol,
  };
}

// ── Fetch OHLC for RSI calculation ────────────────────────
async function fetchOHLC(coinId: string): Promise<number[]> {
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`,
    { params: { vs_currency: "usd", days: 1 } }
  );
  // Returns array of [timestamp, open, high, low, close]
  return res.data.map((candle: number[]) => candle[4]); // closing prices
}

// ── RSI calculation ───────────────────────────────────────
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50; // not enough data, neutral

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains  += diff;
    else           losses -= diff;
  }

  const avgGain = gains  / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs  = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ── Determine trend and confidence ───────────────────────
function analyzeTrend(rsi: number, change4h: number): {
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
} {
  let confidence = 0;
  let trend: "bullish" | "bearish" | "neutral" = "neutral";

  if (rsi < 35 && change4h < -1) {
    trend      = "bearish";
    confidence = Math.min(90, 50 + (35 - rsi) * 2 + Math.abs(change4h) * 5);
  } else if (rsi > 65 && change4h > 1) {
    trend      = "bullish";
    confidence = Math.min(90, 50 + (rsi - 65) * 2 + change4h * 5);
  } else if (rsi < 30) {
    trend      = "bearish";
    confidence = Math.min(75, 40 + (30 - rsi) * 2);
  } else if (rsi > 70) {
    trend      = "bullish";
    confidence = Math.min(75, 40 + (rsi - 70) * 2);
  } else {
    trend      = "neutral";
    confidence = 30;
  }

  return { trend, confidence };
}

// ── Main export: get signal for an asset ─────────────────
export async function getMarketSignal(
  asset: string,          // e.g. "ETH"
  coinId: string          // e.g. "ethereum"
): Promise<MarketSignal> {
  const [priceData, closes] = await Promise.all([
    fetchPriceData(coinId),
    fetchOHLC(coinId),
  ]);

  const rsi              = calculateRSI(closes);
  const { trend, confidence } = analyzeTrend(rsi, priceData.change4h);

  return {
    asset,
    price:         priceData.price,
    rsi:           Math.round(rsi * 100) / 100,
    priceChange4h: Math.round(priceData.change4h * 100) / 100,
    volume24h:     priceData.volume24h,
    trend,
    confidence,
    timestamp:     Date.now(),
  };
}