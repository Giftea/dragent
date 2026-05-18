export interface AvalanchePrice {
    asset: string;
    price: number;
    liquidity: number;
    dex: string;
    timestamp: number;
}
export declare function getAvalanchePrice(asset: string): Promise<AvalanchePrice>;
export declare function getKitePrice(asset: string): Promise<AvalanchePrice>;
export declare function prefetchAllPrices(): Promise<void>;
//# sourceMappingURL=avalancheData.d.ts.map