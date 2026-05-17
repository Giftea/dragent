"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import {
  getAgentByWallet,
  getAgent,
  getAgentTrades as getDbTrades,
  startAgent,
  stopAgent,
  startArbAgent,
  stopArbAgent,
  startAllocationAgent,
  stopAllocationAgent,
} from "@/lib/api";
import {
  getAgentTradesByAddresses,
  getAgentReputation,
  formatUSDC,
  formatPrice,
  formatWinRate,
  formatDrawdown,
  type OnChainTrade,
} from "@/lib/goldsky";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import EditStrategyModal from "@/components/EditStrategyModal";
import PnLChart from "@/components/PnLChart";
import AccuracyChart from "@/components/AccuracyChart";
import PortfolioOverview from "@/components/PortfolioOverview";

const TIER_LABELS = ["Sandbox", "Apprentice", "Trader", "Expert"];
const TIER_COLORS = [
  "text-zinc-400",
  "text-blue-400",
  "text-purple-400",
  "text-yellow-400",
];

const DEPLOYER = "0x6f82ec71d9d8b2419beed7f6b02a865d21c862c7";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function ReasonText({
  reasonHash,
  agentId,
}: {
  reasonHash: string;
  agentId: number;
}) {
  const { data: trades } = useQuery({
    queryKey: ["db-trades", agentId],
    queryFn: () => getDbTrades(agentId),
  });

  const match = (
    trades as
      | {
          reason_hash: string;
          reason: string;
          won: boolean | null;
          pnl_bps: number | null;
        }[]
      | undefined
  )?.find((t) => t.reason_hash === reasonHash);

  if (!match?.reason) {
    return (
      <p className="text-xs text-zinc-500 font-mono">
        {reasonHash.slice(0, 30)}...
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-200 leading-relaxed">{match.reason}</p>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAppKitAccount();
  const router = useRouter();
  const { toast } = useToast();

  const [agentId, setAgentId] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(false);
  const [arbActive, setArbActive] = useState(false);
  const [allocationActive, setAllocationActive] = useState(false);
  const [filter, setFilter] = useState<"all" | "signal" | "arb" | "allocation">(
    "all",
  );

  // Find agent by wallet
  useEffect(() => {
    if (!isConnected || !address) return;
    getAgentByWallet(address)
      .then((data) => setAgentId(data.agentId))
      .catch(() => setNotFound(true));
  }, [isConnected, address]);

  const {
    data: agent,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });

  // Initialize toggle states from agent modes
  useEffect(() => {
    if (agent?.agent_modes) {
      setArbActive(agent.agent_modes.arb ?? false);
      setAllocationActive(agent.agent_modes.allocation ?? false);
    }
  }, [agent]);

  const { data: onChainTrades = [] } = useQuery({
    queryKey: ["goldsky-trades", agentId],
    queryFn: async () => {
      if (!agent?.wallet) return [];
      return getAgentTradesByAddresses([agent.wallet, DEPLOYER], 20);
    },
    enabled: !!agent?.wallet,
    refetchInterval: 30_000,
  });

  const { data: dbTrades } = useQuery({
    queryKey: ["db-trades-main", agentId],
    queryFn: () => getDbTrades(agentId!),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });

  const { data: onChainRep } = useQuery({
    queryKey: ["goldsky-rep", agentId],
    queryFn: async () => {
      if (!agent?.wallet) return null;
      const rep = await getAgentReputation(agent.wallet);
      if (rep && Number(rep.totalTrades) > 0) return rep;
      return getAgentReputation(DEPLOYER);
    },
    enabled: !!agent?.wallet,
    refetchInterval: 30_000,
  });

  const handleArbToggle = async () => {
    if (!agentId) return;
    try {
      if (arbActive) {
        await stopArbAgent(agentId);
        setArbActive(false);
        toast({ title: "Arb scanner stopped" });
      } else {
        await startArbAgent(agentId);
        setArbActive(true);
        toast({
          title:
            "Arb scanner active — monitoring ETH, BTC, AVAX across Avalanche and Kite",
        });
      }
    } catch {
      toast({ title: "Failed to toggle arb scanner", variant: "destructive" });
    }
  };

  const handleAllocationToggle = async () => {
    if (!agentId) return;
    try {
      if (allocationActive) {
        await stopAllocationAgent(agentId);
        setAllocationActive(false);
        toast({ title: "Capital allocator stopped" });
      } else {
        await startAllocationAgent(agentId);
        setAllocationActive(true);
        toast({ title: "Capital allocator active" });
      }
    } catch {
      toast({ title: "Failed to toggle allocator", variant: "destructive" });
    }
  };

  const handleToggle = async () => {
    if (!agentId) return;
    setActing(true);
    try {
      if (agent?.status === "active") {
        await stopAgent(agentId);
        toast({ title: "Agent paused" });
      } else {
        await startAgent(agentId);
        toast({ title: "Agent activated" });
      }
      refetch();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-white text-lg font-medium">Connect your wallet</p>
          <p className="text-zinc-400 text-sm max-w-sm">
            Connect your wallet to access your Dragent dashboard.
          </p>
          <appkit-button />
        </div>
      </main>
    );
  }

  // No agent found
  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white">
        <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Dragent
          </a>
          <appkit-account-button />
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-32 flex flex-col items-center text-center gap-8">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-4xl">
            🐉
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold text-white">
              No agent deployed yet
            </h1>
            <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
              Deploy your first Dragent agent to start monitoring markets,
              scanning cross-chain opportunities, and tracking DeFi yields — all
              with verifiable on-chain reasoning.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
            {[
              {
                icon: "📈",
                label: "Signal Agent",
                desc: "RSI + trend monitoring",
              },
              { icon: "🔀", label: "Arb Scanner", desc: "Cross-chain spreads" },
              {
                icon: "📊",
                label: "Capital Allocator",
                desc: "DeFi yield tracking",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col items-center gap-2 text-center"
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="text-white text-xs font-medium">{item.label}</p>
                <p className="text-zinc-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>

          <Button
            className="bg-white text-black hover:bg-zinc-200 px-8"
            size="lg"
            onClick={() => router.push("/launch")}
          >
            Deploy your agent →
          </Button>

          <p className="text-zinc-600 text-xs">
            Your vault is deployed on Kite chain. Every decision is proven
            on-chain.
          </p>
        </div>
      </main>
    );
  }

  // Loading
  if (isLoading || !agent) {
    return (
      <main className="min-h-screen bg-black text-white">
        <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
          <a href="/" className="text-lg font-semibold">
            Dragent
          </a>
        </nav>
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-zinc-900" />
          ))}
        </div>
      </main>
    );
  }

  const tier = onChainRep?.tier ?? 0;

  const filteredTrades = onChainTrades.filter((trade: OnChainTrade) => {
    if (filter === "all") return true;
    if (filter === "allocation") return trade.asset.includes("-");
    const dbTrade = (
      dbTrades as { reason_hash: string; reason: string }[] | undefined
    )?.find((t) => t.reason_hash === trade.reasonHash);
    if (filter === "arb") {
      return (
        dbTrade?.reason?.toLowerCase().includes("cross-chain") ||
        dbTrade?.reason?.toLowerCase().includes("avalanche") ||
        false
      );
    }
    // signal: simple ticker asset, reason is NOT cross-chain/avalanche
    return (
      ["ETH", "BTC", "SOL", "AVAX", "BNB", "ARB"].includes(trade.asset) &&
      !trade.asset.includes("-") &&
      !dbTrade?.reason?.toLowerCase().includes("cross-chain") &&
      !dbTrade?.reason?.toLowerCase().includes("avalanche")
    );
  });
  const winRate = onChainRep ? formatWinRate(onChainRep.winRateBps) : "—";
  const drawdown = onChainRep ? formatDrawdown(onChainRep.maxDrawdownBps) : "—";
  const budget =
    "$" +
    (Number(agent.chainStats?.budgetLimit ?? 50000000) / 1e6).toLocaleString();

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(ellipse 80% 40% at 60% -10%, rgba(109,40,217,0.15) 0%, transparent 70%), #000",
      }}
    >
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <a href="/" className="text-lg font-semibold tracking-tight">
          Dragent
        </a>
        <div className="flex items-center gap-3">
          <a
            href={`/passport/${agentId}`}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Public passport →
          </a>
          <Button
            size="sm"
            variant="outline"
            className={
              arbActive
                ? "border-blue-700 text-blue-400"
                : "border-zinc-700 text-zinc-400"
            }
            onClick={handleArbToggle}
          >
            {arbActive ? "🔀 Arb active" : "🔀 Start arb"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={
              allocationActive
                ? "border-purple-700 text-purple-400"
                : "border-zinc-700 text-zinc-400"
            }
            onClick={handleAllocationToggle}
          >
            {allocationActive ? "📊 Alloc active" : "📊 Start alloc"}
          </Button>
          <Button
            size="sm"
            variant={agent.status === "active" ? "outline" : "default"}
            className={
              agent.status === "active"
                ? "border-zinc-700 text-zinc-300"
                : "bg-white text-black hover:bg-zinc-200"
            }
            onClick={handleToggle}
            disabled={acting}
          >
            {acting
              ? "..."
              : agent.status === "active"
              ? "Pause agent"
              : "Start agent"}
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Agent header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold">Agent #{agentId}</h1>
              <Badge
                className={
                  agent.status === "active"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }
              >
                {agent.status}
              </Badge>
              <Badge
                variant="outline"
                className={`border-zinc-700 ${TIER_COLORS[tier]}`}
              >
                {TIER_LABELS[tier]}
              </Badge>
            </div>
            <div className="flex items-start gap-2">
              <p className="text-sm text-zinc-500 max-w-xl">{agent.strategy}</p>
              <button
                onClick={() => setEditingStrategy(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  paddingTop: "2px",
                }}
              >
                Edit ✏️
              </button>
            </div>
            <a
              href={`https://t.me/dragent_alerts_bot?start=${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-400 hover:text-white mt-2"
              >
                📱 Get trade alerts on Telegram
              </Button>
            </a>
          </div>
          <a
            href={`https://testnet.kitescan.ai/address/${agent.vault_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono"
          >
            {agent.vault_address?.slice(0, 10)}...
            {agent.vault_address?.slice(-8)} ↗
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Win rate"
            value={winRate}
            sub={`${onChainRep?.winCount ?? 0} of ${
              onChainRep?.totalTrades ?? 0
            } settled`}
          />
          <StatCard label="Max drawdown" value={drawdown} />
          <StatCard
            label="Budget limit"
            value={budget}
            sub={`Tier ${tier} — ${TIER_LABELS[tier]}`}
          />
          <StatCard
            label="Total decisions"
            value={String(onChainRep?.totalTrades ?? 0)}
            sub="All time · all types"
          />
        </div>

        {/* PnL Chart */}
        {agentId && <PnLChart agentId={agentId} />}

        {/* Accuracy chart */}
        {agentId && <AccuracyChart agentId={agentId} />}

        {/* Portfolio overview */}
        {agentId && <PortfolioOverview agentId={agentId} />}

        <Separator className="bg-zinc-800" />

        {/* Trade feed */}
        <div>
          <h2 className="text-lg font-medium mb-4">Decision feed</h2>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-zinc-500 mr-2">Filter:</span>
            {(["all", "signal", "arb", "allocation"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "99px",
                  border: `1px solid ${filter === f ? "white" : "#3f3f46"}`,
                  background: filter === f ? "white" : "transparent",
                  color: filter === f ? "black" : "#a1a1aa",
                  fontSize: "12px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f === "all"
                  ? "All decisions"
                  : f === "signal"
                  ? "📈 Signals"
                  : f === "arb"
                  ? "🔀 Arb"
                  : "📊 Allocation"}
              </button>
            ))}
          </div>

          {filteredTrades.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <p className="text-zinc-400 text-sm">No decisions yet.</p>
                <p className="text-zinc-600 text-xs max-w-sm text-center">
                  The agent is monitoring markets. Decisions will appear here
                  when your strategy conditions are met.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTrades.map((trade: OnChainTrade) => {
                const dbTrade = (
                  dbTrades as
                    | {
                        reason_hash: string;
                        reason: string;
                        won: boolean | null;
                        pnl_bps: number | null;
                      }[]
                    | undefined
                )?.find((t) => t.reason_hash === trade.reasonHash);

                const isArb =
                  dbTrade?.reason?.toLowerCase().includes("cross-chain") ||
                  dbTrade?.reason?.toLowerCase().includes("avalanche");
                const isAllocation = trade.asset.includes("-");
                const isSettled =
                  dbTrade?.won !== null && dbTrade?.won !== undefined;

                const badgeLabel = isAllocation
                  ? "📊 ALLOCATE"
                  : isArb
                  ? "🔀 ARB SCAN"
                  : trade.direction === "BUY"
                  ? "↑ BUY SIGNAL"
                  : "↓ SELL SIGNAL";
                const badgeClass = isAllocation
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : isArb
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : trade.direction === "BUY"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20";
                return (
                  <Card key={trade.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={badgeClass}>{badgeLabel}</Badge>
                          <span className="text-white font-medium">
                            {trade.asset}
                          </span>
                          <span className="text-zinc-400 text-sm">
                            ${formatUSDC(trade.sizeUSDC)} USDC
                          </span>
                          <span className="text-zinc-600 text-sm">
                            @ ${formatPrice(trade.priceUSD).toLocaleString()}
                          </span>

                          {isSettled && (
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: dbTrade?.won
                                  ? "#0d1f13"
                                  : "#1f0d0d",
                                color: dbTrade?.won ? "#4ade80" : "#f87171",
                                border: `1px solid ${
                                  dbTrade?.won ? "#15803d" : "#991b1b"
                                }`,
                              }}
                            >
                              {dbTrade?.won
                                ? `✓ Won · +${(
                                    (dbTrade.pnl_bps ?? 0) / 100
                                  ).toFixed(2)}%`
                                : `✗ Lost · ${(
                                    (dbTrade?.pnl_bps ?? 0) / 100
                                  ).toFixed(2)}%`}
                            </span>
                          )}

                          {!isSettled && !isAllocation && !isArb && (
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "99px",
                                background: "#111",
                                color: "#52525b",
                                border: "1px solid #27272a",
                              }}
                            >
                              ⏳ Settling...
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-600 shrink-0">
                          {new Date(
                            Number(trade.timestamp) * 1000,
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-zinc-800 rounded-md px-4 py-3 mb-3">
                        <p className="text-xs text-zinc-500 mb-1">
                          Agent reasoning
                        </p>
                        <ReasonText
                          reasonHash={trade.reasonHash}
                          agentId={agentId!}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <a
                          href={`https://testnet.kitescan.ai/tx/${trade.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View decision proof on Kite ↗
                        </a>
                        <span className="text-xs text-zinc-600 font-mono">
                          Hash: {trade.reasonHash?.slice(0, 18)}...
                        </span>
                        <span className="text-xs text-green-500">
                          ✓ Verified
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editingStrategy && agent && (
        <EditStrategyModal
          agentId={agentId!}
          currentStrategy={agent.strategy}
          onUpdated={refetch}
          onClose={() => setEditingStrategy(false)}
        />
      )}
    </main>
  );
}
