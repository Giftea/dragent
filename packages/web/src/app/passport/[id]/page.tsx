import { getAgent } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getAgentTrades,
  getAgentReputation,
  formatUSDC,
  formatPrice,
  formatWinRate,
  formatDrawdown,
  type OnChainTrade,
  getAgentTradesByAddresses,
} from "@/lib/goldsky";

const DEPLOYER = "0x6f82ec71d9d8b2419beed7f6b02a865d21c862c7";

const TIER_LABELS = ["Sandbox", "Apprentice", "Trader", "Expert"];
const TIER_COLORS = [
  "text-zinc-400 border-zinc-700",
  "text-blue-400 border-blue-900",
  "text-purple-400 border-purple-900",
  "text-yellow-400 border-yellow-900",
];

export default async function PassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agentId = Number(id);
  let agent: Awaited<ReturnType<typeof getAgent>> | null = null;

  try {
    agent = await getAgent(agentId);
  } catch {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Agent not found.</p>
      </main>
    );
  }

  const [onChainTrades, onChainRep] = await Promise.all([
    getAgentTradesByAddresses([agent.wallet, DEPLOYER], 10),
    getAgentReputation(agent.wallet),
  ]);

  const tier = onChainRep?.tier ?? 0;
  const winRate = onChainRep ? formatWinRate(onChainRep.winRateBps) : "0.0%";
  const drawdown = onChainRep
    ? formatDrawdown(onChainRep.maxDrawdownBps)
    : "0.0%";
  const budget = (
    Number(agent.chainStats?.budgetLimit ?? 50000000) / 1e6
  ).toLocaleString();

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <a href="/" className="text-lg font-semibold tracking-tight">
          Dragent
        </a>
        <Badge
          variant="outline"
          className="border-zinc-700 text-zinc-400 text-xs"
        >
          Public passport
        </Badge>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-4xl">
            🐉
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-1">Agent #{agentId}</h1>
            <p className="text-zinc-500 text-sm font-mono">
              {agent.vault_address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`border ${TIER_COLORS[tier]}`} variant="outline">
              {TIER_LABELS[tier]}
            </Badge>
            <Badge
              className={
                agent.status === "active"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }
            >
              {agent.status}
            </Badge>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Win rate",
              value: winRate,
              sub: `${onChainRep?.winCount ?? 0} wins`,
            },
            {
              label: "Total trades",
              value: String(onChainRep?.totalTrades ?? 0),
              sub: "All time",
            },
            { label: "Max drawdown", value: drawdown, sub: "Worst loss" },
            {
              label: "Budget tier",
              value: "$" + budget,
              sub: TIER_LABELS[tier],
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-5"
            >
              <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-zinc-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <Separator className="bg-zinc-800" />

        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            Strategy
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-zinc-300 text-sm leading-relaxed">
              {agent.strategy}
            </p>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
            Decision history
          </p>
          {onChainTrades.length === 0 ? (
            <p className="text-zinc-600 text-sm">No trades yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {onChainTrades.map((trade: OnChainTrade) => (
                <Card key={trade.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            trade.direction === "BUY"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {trade.direction}
                        </Badge>
                        <span className="text-white font-medium text-sm">
                          {trade.asset}
                        </span>
                        <span className="text-zinc-400 text-sm">
                          ${formatUSDC(trade.sizeUSDC)} @ $
                          {formatPrice(trade.priceUSD).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {new Date(
                          Number(trade.timestamp) * 1000,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-zinc-600 font-mono">
                        {trade.reasonHash.slice(0, 30)}...
                      </p>
                      <span className="text-xs text-green-500">✓ On-chain</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-zinc-600">
            All decisions are cryptographically proven on Kite chain. Reputation
            scores are immutable and tamper-proof.
          </p>
          <a
            href={`https://testnet.kitescan.ai/address/${agent.vault_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            Verify on KiteScan ↗
          </a>
        </div>
      </div>
    </main>
  );
}
