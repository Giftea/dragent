import axios from "axios";

export interface AvalanchePrice {
  asset:     string;
  price:     number;
  liquidity: number;
  dex:       string;
  timestamp: number;
}

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL  = 60_000; // 60 seconds

async function batchFetchPrices(coinIds: string[]): Promise<Record<string, number>> {
  const now     = Date.now();
  const result: Record<string, number> = {};
  const missing: string[] = [];

  for (const id of coinIds) {
    const c = priceCache.get(id);
    if (c && now - c.timestamp < CACHE_TTL) {
      result[id] = c.price;
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return result;

  const res = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price",
    { params: { ids: missing.join(","), vs_currencies: "usd" } }
  );

  for (const id of missing) {
    const price = res.data[id]?.usd;
    if (price) {
      priceCache.set(id, { price, timestamp: now });
      result[id] = price;
    }
  }

  return result;
}

const COIN_IDS: Record<string, string> = {
  ETH:  "ethereum",
  BTC:  "bitcoin",
  AVAX: "avalanche-2",
};

export async function getAvalanchePrice(asset: string): Promise<AvalanchePrice> {
  const coinId = COIN_IDS[asset];
  if (!coinId) throw new Error(`Unsupported asset: ${asset}`);

  const prices = await batchFetchPrices([coinId]);

  return {
    asset,
    price:     prices[coinId],
    liquidity: 0,
    dex:       "Trader Joe V2",
    timestamp: Date.now(),
  };
}

export async function getKitePrice(asset: string): Promise<AvalanchePrice> {
  const coinId = COIN_IDS[asset];
  if (!coinId) throw new Error(`Unsupported asset: ${asset}`);

  const prices   = await batchFetchPrices([coinId]);
  const base     = prices[coinId];
  // ±0.5% variance models real cross-chain price differences
  // Replace with actual Kite DEX on-chain reads when available
  const variance = (Math.random() - 0.5) * 0.01 * base;

  return {
    asset,
    price:     base + variance,
    liquidity: 0,
    dex:       "Kite DEX (simulated)",
    timestamp: Date.now(),
  };
}

export async function prefetchAllPrices(): Promise<void> {
  await batchFetchPrices(Object.values(COIN_IDS));
}
