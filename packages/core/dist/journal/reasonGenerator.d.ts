import { MarketSignal } from "../perception/marketData";
export declare function generateReason(signal: MarketSignal, action: "BUY" | "SELL", sizeUSDC: number, strategy: string): Promise<string>;
export declare function logTradeOnChain(signal: MarketSignal, action: "BUY" | "SELL", sizeUSDC: number, reason: string): Promise<{
    tradeId: bigint;
    reasonHash: string;
    txHash: string;
}>;
