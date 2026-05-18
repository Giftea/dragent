export interface MarketSignal {
    asset: string;
    price: number;
    rsi: number;
    priceChange4h: number;
    volume24h: number;
    trend: "bullish" | "bearish" | "neutral";
    confidence: number;
    timestamp: number;
}
export declare function getMarketSignal(asset: string, // e.g. "ETH"
coinId?: string): Promise<MarketSignal>;
//# sourceMappingURL=marketData.d.ts.map