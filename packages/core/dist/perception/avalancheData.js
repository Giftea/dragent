"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvalanchePrice = getAvalanchePrice;
exports.getKitePrice = getKitePrice;
exports.prefetchAllPrices = prefetchAllPrices;
const axios_1 = __importDefault(require("axios"));
const priceCache = new Map();
const CACHE_TTL = 60000; // 60 seconds
async function batchFetchPrices(coinIds) {
    const now = Date.now();
    const result = {};
    const missing = [];
    for (const id of coinIds) {
        const c = priceCache.get(id);
        if (c && now - c.timestamp < CACHE_TTL) {
            result[id] = c.price;
        }
        else {
            missing.push(id);
        }
    }
    if (missing.length === 0)
        return result;
    const res = await axios_1.default.get("https://api.coingecko.com/api/v3/simple/price", { params: { ids: missing.join(","), vs_currencies: "usd" } });
    for (const id of missing) {
        const price = res.data[id]?.usd;
        if (price) {
            priceCache.set(id, { price, timestamp: now });
            result[id] = price;
        }
    }
    return result;
}
const COIN_IDS = {
    ETH: "ethereum",
    BTC: "bitcoin",
    AVAX: "avalanche-2",
};
async function getAvalanchePrice(asset) {
    const coinId = COIN_IDS[asset];
    if (!coinId)
        throw new Error(`Unsupported asset: ${asset}`);
    const prices = await batchFetchPrices([coinId]);
    return {
        asset,
        price: prices[coinId],
        liquidity: 0,
        dex: "Trader Joe V2",
        timestamp: Date.now(),
    };
}
async function getKitePrice(asset) {
    const coinId = COIN_IDS[asset];
    if (!coinId)
        throw new Error(`Unsupported asset: ${asset}`);
    const prices = await batchFetchPrices([coinId]);
    const base = prices[coinId];
    // ±0.5% variance models real cross-chain price differences
    // Replace with actual Kite DEX on-chain reads when available
    const variance = (Math.random() - 0.5) * 0.01 * base;
    return {
        asset,
        price: base + variance,
        liquidity: 0,
        dex: "Kite DEX (simulated)",
        timestamp: Date.now(),
    };
}
async function prefetchAllPrices() {
    await batchFetchPrices(Object.values(COIN_IDS));
}
