export interface ArbOpportunity {
    asset: string;
    avalanchePrice: number;
    kitePrice: number;
    spreadUSD: number;
    spreadBps: number;
    bridgeFeeUSD: number;
    estimatedProfit: number;
    direction: "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE";
    profitable: boolean;
    reason: string;
    confidence: number;
    timestamp: number;
}
export declare function detectArbOpportunity(asset: string): Promise<ArbOpportunity>;
export declare function generateArbReason(opp: ArbOpportunity): Promise<string>;
//# sourceMappingURL=arbDetector.d.ts.map