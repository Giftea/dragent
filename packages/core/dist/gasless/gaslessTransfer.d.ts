import { ethers } from "ethers";
export interface GaslessTransferResult {
    txHash: string;
    success: boolean;
}
export declare function gaslessTransfer(wallet: ethers.Wallet, to: string, amount: number, // in PYUSD (human readable)
network?: "testnet" | "mainnet"): Promise<GaslessTransferResult>;
export declare function getPYUSDBalance(address: string, provider: ethers.Provider): Promise<string>;
