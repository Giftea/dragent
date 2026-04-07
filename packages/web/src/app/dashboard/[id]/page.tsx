"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAgent, getAgentTrades, startAgent, stopAgent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";

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

const TIER_LABELS = ["Sandbox", "Apprentice", "Trader", "Expert"];
const TIER_COLORS = [
  "text-zinc-400",
  "text-blue-400",
  "text-purple-400",
  "text-yellow-400",
];

export default function DashboardPage() {
  const { id } = useParams();
  const agentId = Number(id);
  const [acting, setActing] = useState(false);
  const { address } = useAppKitAccount();

  const {
    data: agent,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
    refetchInterval: 30_000,
  });

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ["trades", agentId],
    queryFn: () => getAgentTrades(agentId),
    refetchInterval: 30_000,
  });

  const handleToggle = async () => {
    setActing(true);
    try {
      if (agent?.status === "active") {
        await stopAgent(agentId);
        toast("Agent paused");
      } else {
        await startAgent(agentId);
        toast("Agent activated");
      }
      refetch();
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(false);
    }
  };

  if (isLoading) {
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

  const stats = agent?.chainStats;
  const winRate = stats ? (stats.winRateBps / 100).toFixed(1) + "%" : "—";
  const drawdown = stats
    ? (Math.abs(stats.maxDrawdownBps) / 100).toFixed(1) + "%"
    : "—";
  const budget = stats
    ? "$" + (Number(stats.budgetLimit) / 1e6).toLocaleString()
    : "—";

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
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
            variant={agent?.status === "active" ? "outline" : "default"}
            className={
              agent?.status === "active"
                ? "border-zinc-700 text-zinc-300"
                : "bg-white text-black hover:bg-zinc-200"
            }
            onClick={handleToggle}
            disabled={acting}
          >
            {acting
              ? "..."
              : agent?.status === "active"
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
                  agent?.status === "active"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }
              >
                {agent?.status ?? "—"}
              </Badge>
              {stats && (
                <Badge
                  variant="outline"
                  className={`border-zinc-700 ${TIER_COLORS[stats.tier]}`}
                >
                  {TIER_LABELS[stats.tier]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500 max-w-xl">{agent?.strategy}</p>
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
            href={`https://testnet.kitescan.ai/address/${agent?.vault_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono"
          >
            {agent?.vault_address?.slice(0, 10)}...
            {agent?.vault_address?.slice(-8)} ↗
          </a>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Win rate"
            value={winRate}
            sub={`${stats?.winCount ?? 0} of ${stats?.totalTrades ?? 0} trades`}
          />
          <StatCard label="Max drawdown" value={drawdown} />
          <StatCard
            label="Budget limit"
            value={budget}
            sub={`Tier ${stats?.tier ?? 0} — ${TIER_LABELS[stats?.tier ?? 0]}`}
          />
          <StatCard
            label="Total trades"
            value={String(stats?.totalTrades ?? 0)}
            sub="All time"
          />
        </div>

        <Separator className="bg-zinc-800" />

        {/* Trade feed */}
        <div>
          <h2 className="text-lg font-medium mb-4">Trade feed</h2>

          {tradesLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 bg-zinc-900" />
              ))}
            </div>
          ) : trades.length === 0 ? (
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
              {trades.map(
                (trade: {
                  id: number;
                  trade_id: number;
                  asset: string;
                  direction: string;
                  size_usdc: number;
                  price_usd: number;
                  reason: string;
                  reason_hash: string;
                  tx_hash: string;
                  created_at: string;
                }) => (
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
                            ${trade.size_usdc} USDC
                          </span>
                          <span className="text-zinc-600 text-sm">
                            @ ${Number(trade.price_usd).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-600">
                          {new Date(trade.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Reason — the key differentiator */}
                      <div className="bg-zinc-800 rounded-md px-4 py-3 mb-3">
                        <p className="text-xs text-zinc-500 mb-1">
                          Agent reasoning
                        </p>
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {trade.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <a
                          href={`https://testnet.kitescan.ai/tx/${trade.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View on Kite ↗
                        </a>
                        <span className="text-xs text-zinc-600 font-mono">
                          Hash: {trade.reason_hash?.slice(0, 18)}...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
