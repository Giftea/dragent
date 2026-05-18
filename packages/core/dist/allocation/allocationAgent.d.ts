import { type ProtocolYield, type AllocationDecision } from "./protocolMonitor";
export declare function generateAllocationReason(best: ProtocolYield, alternatives: ProtocolYield[]): Promise<string>;
export declare function analyzeAllocation(maxRisk?: "low" | "medium" | "high", preferredAsset?: string): Promise<AllocationDecision | null>;
