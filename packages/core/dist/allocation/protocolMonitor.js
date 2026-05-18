"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProtocolYields = fetchProtocolYields;
exports.findBestYield = findBestYield;
const axios_1 = __importDefault(require("axios"));
const DEFI_LLAMA_YIELDS = "https://yields.llama.fi/pools";
const TRACKED_PROTOCOLS = [
    "aave",
    "compound",
    "morpho",
    "spark",
    "fluid",
    "maker",
    "curve",
    "euler",
    "venus",
    "benqi",
];
const TRACKED_CHAINS = ["Ethereum", "Avalanche", "Base", "Arbitrum"];
const TRACKED_ASSETS = ["USDC", "USDT", "DAI", "USDC.e"];
async function fetchProtocolYields() {
    try {
        const res = await axios_1.default.get(DEFI_LLAMA_YIELDS, { timeout: 10000 });
        const pools = res.data.data;
        return pools
            .filter(p => TRACKED_PROTOCOLS.some(proto => p.project.toLowerCase().includes(proto)) &&
            TRACKED_CHAINS.includes(p.chain) &&
            TRACKED_ASSETS.some(asset => p.symbol.toUpperCase().includes(asset)) &&
            p.apy > 0 &&
            p.apy < 100 &&
            p.tvlUsd > 5000000)
            .map(p => ({
            protocol: p.project,
            chain: p.chain,
            asset: p.symbol,
            apy: Math.round(p.apy * 100) / 100,
            tvl: p.tvlUsd,
            risk: assessRisk(p.project, p.tvlUsd, p.apy),
            address: p.pool,
            timestamp: Date.now(),
        }))
            .sort((a, b) => b.apy - a.apy)
            .slice(0, 10);
    }
    catch (err) {
        console.error("Failed to fetch protocol yields:", err);
        return [];
    }
}
function assessRisk(protocol, tvl, apy) {
    const isEstablished = ["aave", "compound", "spark"].some(p => protocol.toLowerCase().includes(p));
    if (isEstablished && tvl > 100000000 && apy < 15)
        return "low";
    if (tvl > 10000000 && apy < 25)
        return "medium";
    return "high";
}
function findBestYield(yields, maxRisk = "medium", preferredAsset = "USDC") {
    const riskOrder = { low: 0, medium: 1, high: 2 };
    const maxRiskLevel = riskOrder[maxRisk];
    const eligible = yields.filter(y => riskOrder[y.risk] <= maxRiskLevel);
    if (eligible.length === 0)
        return null;
    const preferred = eligible.filter(y => y.asset.toUpperCase().includes(preferredAsset.toUpperCase()));
    const pool = preferred.length > 0 ? preferred : eligible;
    return pool.sort((a, b) => {
        const scoreA = a.apy * Math.log10(a.tvl);
        const scoreB = b.apy * Math.log10(b.tvl);
        return scoreB - scoreA;
    })[0];
}
