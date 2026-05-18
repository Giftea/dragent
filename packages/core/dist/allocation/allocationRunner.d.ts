export interface AllocationCycleResult {
    txHash: string;
    reasonHash: string;
    reason: string;
    asset: string;
    apy: number;
}
export declare function runAllocationCycle(agentId: number): Promise<AllocationCycleResult | null>;
//# sourceMappingURL=allocationRunner.d.ts.map