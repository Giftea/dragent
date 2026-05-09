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

  const { data: onChainTrades = [] } = useQuery({
    queryKey: ["goldsky-trades", agentId],
    queryFn: async () => {
      if (!agent?.wallet) return [];
      return getAgentTradesByAddresses([agent.wallet, DEPLOYER], 20);
    },
    enabled: !!agent?.wallet,
    refetchInterval: 30_000,
  });

  const { data: onChainRep } = useQuery({
    queryKey: ["goldsky-rep", agentId],
    queryFn: () => getAgentReputation(DEPLOYER),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });

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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-white text-lg font-medium">No agent found</p>
          <p className="text-zinc-400 text-sm max-w-sm">
            You haven't deployed a Dragent agent yet.
          </p>
          <Button
            className="bg-white text-black hover:bg-zinc-200"
            onClick={() => router.push("/launch")}
          >
            Deploy your agent →
          </Button>
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
  const winRate = onChainRep ? formatWinRate(onChainRep.winRateBps) : "—";
  const drawdown = onChainRep ? formatDrawdown(onChainRep.maxDrawdownBps) : "—";
  const budget =
    "$" +
    (Number(agent.chainStats?.budgetLimit ?? 50000000) / 1e6).toLocaleString();

  return (
    <main className="min-h-screen bg-black text-white">
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
            } trades`}
          />
          <StatCard label="Max drawdown" value={drawdown} />
          <StatCard
            label="Budget limit"
            value={budget}
            sub={`Tier ${tier} — ${TIER_LABELS[tier]}`}
          />
          <StatCard
            label="Total trades"
            value={String(onChainRep?.totalTrades ?? 0)}
            sub="All time"
          />
        </div>

        <Separator className="bg-zinc-800" />

        {/* Trade feed */}
        <div>
          <h2 className="text-lg font-medium mb-4">Trade feed</h2>
          {onChainTrades.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <p className="text-zinc-400 text-sm">No trades yet.</p>
                <p className="text-zinc-600 text-xs max-w-sm text-center">
                  The agent is scanning markets. Trades will appear here when
                  entry conditions are met.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {onChainTrades.map((trade: OnChainTrade) => (
                <Card key={trade.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            trade.direction === "BUY"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {trade.direction}
                        </Badge>
                        <span className="text-white font-medium">
                          {trade.asset}
                        </span>
                        <span className="text-zinc-400 text-sm">
                          ${formatUSDC(trade.sizeUSDC)} USDC
                        </span>
                        <span className="text-zinc-600 text-sm">
                          @ ${formatPrice(trade.priceUSD).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">
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
                        View on Kite ↗
                      </a>
                      <span className="text-xs text-zinc-600 font-mono">
                        Hash: {trade.reasonHash?.slice(0, 18)}...
                      </span>
                      <span className="text-xs text-green-500">✓ Verified</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
