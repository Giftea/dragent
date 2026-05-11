import axios from "axios";

export interface ProtocolYield {
  protocol:  string;
  chain:     string;
  asset:     string;
  apy:       number;
  tvl:       number;
  risk:      "low" | "medium" | "high";
  address:   string;
  timestamp: number;
}

export interface AllocationDecision {
  recommended:  ProtocolYield;
  alternatives: ProtocolYield[];
  reason:       string;
  confidence:   number;
  timestamp:    number;
}

const DEFI_LLAMA_YIELDS  = "https://yields.llama.fi/pools";

const TRACKED_PROTOCOLS = [
  "aave",
  "compound",
  "morpho",
  "spark",
  "fluid",
  "maker",
  "curve",
  "euler",
  "venus",
  "benqi",
];

const TRACKED_CHAINS = ["Ethereum", "Avalanche", "Base", "Arbitrum"];

const TRACKED_ASSETS = ["USDC", "USDT", "DAI", "USDC.e"];

export async function fetchProtocolYields(): Promise<ProtocolYield[]> {
  try {
    const res   = await axios.get(DEFI_LLAMA_YIELDS, { timeout: 10000 });
    const pools = res.data.data as {
      project: string;
      chain:   string;
      symbol:  string;
      apy:     number;
      tvlUsd:  number;
      pool:    string;
    }[];

    return pools
      .filter(p =>
        TRACKED_PROTOCOLS.some(proto =>
          p.project.toLowerCase().includes(proto)
        ) &&
        TRACKED_CHAINS.includes(p.chain) &&
        TRACKED_ASSETS.some(asset =>
          p.symbol.toUpperCase().includes(asset)
        ) &&
        p.apy > 0 &&
        p.apy < 100 &&
        p.tvlUsd > 5_000_000
      )
      .map(p => ({
        protocol:  p.project,
        chain:     p.chain,
        asset:     p.symbol,
        apy:       Math.round(p.apy * 100) / 100,
        tvl:       p.tvlUsd,
        risk:      assessRisk(p.project, p.tvlUsd, p.apy),
        address:   p.pool,
        timestamp: Date.now(),
      }))
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 10);

  } catch (err) {
    console.error("Failed to fetch protocol yields:", err);
    return [];
  }
}

function assessRisk(
  protocol: string,
  tvl:      number,
  apy:      number
): "low" | "medium" | "high" {
  const isEstablished = ["aave", "compound", "spark"].some(p =>
    protocol.toLowerCase().includes(p)
  );
  if (isEstablished && tvl > 100_000_000 && apy < 15) return "low";
  if (tvl > 10_000_000 && apy < 25) return "medium";
  return "high";
}

export function findBestYield(
  yields:         ProtocolYield[],
  maxRisk:        "low" | "medium" | "high" = "medium",
  preferredAsset: string = "USDC"
): ProtocolYield | null {
  const riskOrder    = { low: 0, medium: 1, high: 2 };
  const maxRiskLevel = riskOrder[maxRisk];

  const eligible = yields.filter(y => riskOrder[y.risk] <= maxRiskLevel);
  if (eligible.length === 0) return null;

  const preferred = eligible.filter(y =>
    y.asset.toUpperCase().includes(preferredAsset.toUpperCase())
  );
  const pool = preferred.length > 0 ? preferred : eligible;

  return pool.sort((a, b) => {
    const scoreA = a.apy * Math.log10(a.tvl);
    const scoreB = b.apy * Math.log10(b.tvl);
    return scoreB - scoreA;
  })[0];
}
