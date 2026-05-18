import { MarketSignal } from "../perception/marketData";
export interface TradingRules {
    entryConditions: {
        rsiBelow?: number;
        rsiAbove?: number;
        priceChangePct?: number;
        trendRequired?: "bullish" | "bearish" | "neutral";
        minConfidence?: number;
    };
    riskRules: {
        maxRiskPctPerTrade: number;
        maxDrawdownPct: number;
        stopLossPct: number;
        takeProfitPct: number;
    };
    assets: string[];
    direction: "long" | "short" | "both";
}
export declare function interpretStrategy(naturalLanguageStrategy: string): Promise<TradingRules>;
export declare function evaluateSignal(signal: MarketSignal, rules: TradingRules): {
    shouldTrade: boolean;
    action: "BUY" | "SELL" | "HOLD";
    reason: string;
};
//# sourceMappingURL=interpreter.d.ts.map