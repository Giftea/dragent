export declare function logArbOpportunity(asset: string, reason: string, price: number, direction: "AVALANCHE_TO_KITE" | "KITE_TO_AVALANCHE"): Promise<{
    txHash: string;
    reasonHash: string;
}>;
export interface ArbCycleResult {
    asset: string;
    direction: "BUY" | "SELL";
    price: number;
    reason: string;
    reasonHash: string;
    txHash: string;
}
export declare function runArbCycle(agentId: number, agentWallet: string): Promise<ArbCycleResult[]>;
