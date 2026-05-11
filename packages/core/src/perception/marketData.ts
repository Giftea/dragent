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

// ── Simple price cache to avoid rate limits ───────────────
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL  = 30_000; // 30 seconds

async function fetchPriceData(coinId: string): Promise<{
  price: number;
  change4h: number;
  volume24h: number;
}> {
  const cached = priceCache.get(coinId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { price: cached.price, change4h: 0, volume24h: 0 };
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids:                 coinId,
            vs_currencies:       "usd",
            include_24hr_vol:    true,
            include_24hr_change: true,
          },
        }
      );

      const data   = res.data[coinId];
      const result = {
        price:     data.usd,
        change4h:  data.usd_24h_change / 6,
        volume24h: data.usd_24h_vol,
      };

      priceCache.set(coinId, { price: data.usd, timestamp: Date.now() });
      return result;

    } catch (err: unknown) {
      const status = (err as { response?: { status: number } }).response?.status;
      if (status === 429 && attempt < 3) {
        const wait = attempt * 10_000; // 10s, 20s
        console.warn(`⚠️  CoinGecko rate limit, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Failed to fetch price for ${coinId}`);
}

// ── OHLC cache ────────────────────────────────────────────
const ohlcCache = new Map<string, { closes: number[]; timestamp: number }>();
const OHLC_CACHE_TTL = 5 * 60_000; // 5 minutes — OHLC doesn't change that fast

async function fetchOHLC(coinId: string): Promise<number[]> {
  const cached = ohlcCache.get(coinId);
  if (cached && Date.now() - cached.timestamp < OHLC_CACHE_TTL) {
    return cached.closes;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`,
        { params: { vs_currency: "usd", days: 1 } }
      );
      const closes = res.data.map((candle: number[]) => candle[4]);
      ohlcCache.set(coinId, { closes, timestamp: Date.now() });
      return closes;

    } catch (err: unknown) {
      const status = (err as { response?: { status: number } }).response?.status;
      if (status === 429 && attempt < 3) {
        const wait = attempt * 15_000;
        console.warn(`⚠️  CoinGecko OHLC rate limit (${coinId}), waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      const stale = ohlcCache.get(coinId);
      if (stale) {
        console.warn(`⚠️  Using stale OHLC for ${coinId}`);
        return stale.closes;
      }
      console.warn(`⚠️  No OHLC data for ${coinId}, using neutral RSI`);
      return [];
    }
  }
  return [];
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

const COINGECKO_IDS: Record<string, string> = {
  ETH:  "ethereum",
  BTC:  "bitcoin",
  SOL:  "solana",
  AVAX: "avalanche-2",
  BNB:  "binancecoin",
  ARB:  "arbitrum",
};

// ── Main export: get signal for an asset ─────────────────
export async function getMarketSignal(
  asset:   string,   // e.g. "ETH"
  coinId?: string    // e.g. "ethereum" — falls back to COINGECKO_IDS
): Promise<MarketSignal> {
  const id = coinId ?? COINGECKO_IDS[asset];
  if (!id) throw new Error(`Unknown asset: ${asset}`);

  const [priceData, closes] = await Promise.all([
    fetchPriceData(id),
    fetchOHLC(id),
  ]);

  const rsi                   = calculateRSI(closes);
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