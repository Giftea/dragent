export interface ProtocolYield {
    protocol: string;
    chain: string;
    asset: string;
    apy: number;
    tvl: number;
    risk: "low" | "medium" | "high";
    address: string;
    timestamp: number;
}
export interface AllocationDecision {
    recommended: ProtocolYield;
    alternatives: ProtocolYield[];
    reason: string;
    confidence: number;
    timestamp: number;
}
export declare function fetchProtocolYields(): Promise<ProtocolYield[]>;
export declare function findBestYield(yields: ProtocolYield[], maxRisk?: "low" | "medium" | "high", preferredAsset?: string): ProtocolYield | null;
