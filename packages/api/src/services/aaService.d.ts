import { GokiteAASDK } from "gokite-aa-sdk";
import { ethers } from "ethers";
export declare const sdk: GokiteAASDK;
export declare const provider: ethers.JsonRpcProvider;
export declare const signer: ethers.Wallet;
export declare const signFunction: (userOpHash: string) => Promise<string>;
export declare function getAAWalletAddress(signerAddress: string): string;
export declare function getAAWalletBalance(signerAddress: string): Promise<string>;
export declare function sendUserOp(signerAddress: string, target: string, callData: string, value?: bigint): Promise<{
    txHash: string;
    success: boolean;
}>;
export declare function sendBatchUserOp(signerAddress: string, operations: {
    target: string;
    callData: string;
    value?: bigint;
}[]): Promise<{
    txHash: string;
    success: boolean;
}>;
export declare function deployAgentVaultAA(signerAddress: string, settlementToken: string): Promise<string>;
export declare function configureSpendingRules(signerAddress: string, vaultAddress: string, budgetUSDC: number, timeWindow?: number): Promise<void>;
export declare function logTradeViaAA(signerAddress: string, tradeJournalAddr: string, asset: string, direction: string, sizeUSDC: bigint, priceUSD: bigint, reasonHash: string): Promise<{
    txHash: string;
}>;
