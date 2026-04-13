const GOLDSKY_URL = process.env.NEXT_PUBLIC_GOLDSKY_URL!;

async function query<T>(gql: string): Promise<T> {
  const res = await fetch(GOLDSKY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ── Types ─────────────────────────────────────────────────
export interface OnChainTrade {
  id: string;
  tradeId: string;
  agentId: string;
  asset: string;
  direction: string;
  sizeUSDC: string;
  priceUSD: string;
  reasonHash: string;
  timestamp: string;
}

export interface OnChainReputation {
  id: string;
  totalTrades: string;
  winCount: string;
  winRateBps: string;
  maxDrawdownBps: string;
  tier: number;
}

export interface OnChainVault {
  id: string;
  user: string;
  vaultAddress: string;
  createdAt: string;
}

export interface OnChainAgent {
  id: string;
  address: string;
  totalTrades: string;
  createdAt: string;
  reputation: OnChainReputation | null;
  vault: OnChainVault | null;
}

// ── Queries ───────────────────────────────────────────────
export async function getAgentTrades(
  agentAddress: string,
  limit = 20,
): Promise<OnChainTrade[]> {
  const data = await query<{ trades: OnChainTrade[] }>(`{
    trades(
      first: ${limit},
      orderBy: timestamp,
      orderDirection: desc,
      where: { agentId: "${agentAddress.toLowerCase()}" }
    ) {
      id tradeId agentId asset direction
      sizeUSDC priceUSD reasonHash timestamp
    }
  }`);
  return data.trades;
}

export async function getAgentReputation(
  agentAddress: string,
): Promise<OnChainReputation | null> {
  const data = await query<{ agentReputation: OnChainReputation | null }>(`{
    agentReputation(id: "${agentAddress.toLowerCase()}") {
      id totalTrades winCount winRateBps maxDrawdownBps tier
    }
  }`);
  return data.agentReputation;
}

export async function getAgentOnChain(
  agentAddress: string,
): Promise<OnChainAgent | null> {
  const data = await query<{ agent: OnChainAgent | null }>(`{
    agent(id: "${agentAddress.toLowerCase()}") {
      id address totalTrades createdAt
      reputation {
        totalTrades winCount winRateBps maxDrawdownBps tier
      }
      vault {
        id vaultAddress createdAt
      }
    }
  }`);
  return data.agent;
}

export async function getAllTrades(limit = 50): Promise<OnChainTrade[]> {
  const data = await query<{ trades: OnChainTrade[] }>(`{
    trades(
      first: ${limit},
      orderBy: timestamp,
      orderDirection: desc
    ) {
      id tradeId agentId asset direction
      sizeUSDC priceUSD reasonHash timestamp
    }
  }`);
  return data.trades;
}

export async function getAgentTradesByAddresses(
  addresses: string[],
  limit = 20
): Promise<OnChainTrade[]> {
  const data = await query<{ trades: OnChainTrade[] }>(`{
    trades(
      first: 50,
      orderBy: timestamp,
      orderDirection: desc
    ) {
      id tradeId agentId asset direction
      sizeUSDC priceUSD reasonHash timestamp
    }
  }`);

  const normalized = addresses.map(a => a.toLowerCase());
  return data.trades
    .filter(t => normalized.includes(t.agentId.toLowerCase()))
    .slice(0, limit);
}

// ── Formatters ────────────────────────────────────────────
export function formatUSDC(raw: string): number {
  return Number(raw) / 1e6;
}

export function formatPrice(raw: string): number {
  return Number(raw) / 1e8;
}

export function formatWinRate(bps: string): string {
  return (Number(bps) / 100).toFixed(1) + "%";
}

export function formatDrawdown(bps: string): string {
  return (Number(bps) / 100).toFixed(1) + "%";
}
