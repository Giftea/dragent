"use client";

import { useQuery } from "@tanstack/react-query";
import { getAgentPortfolio } from "@/lib/api";

interface Portfolio {
  totalBudget: number;
  allocated:   number;
  idle:        number;
  currency:    string;
  agents: {
    signal: {
      active:    boolean;
      assets:    string[];
      decisions: number;
      winRate:   number;
    };
    arb: {
      active:          boolean;
      lastScan:        string | null;
      assetsMonitored: string[];
    };
    allocation: {
      active:          boolean;
      currentProtocol: string | null;
      currentApy:      number | null;
      liveApy:         number | null;
      liveProtocol:    string | null;
      lastUpdated:     string | null;
    };
  };
  performance: {
    totalDecisions: number;
    wins:           number;
    losses:         number;
    totalPnlBps:    number;
  };
}

function AgentRow({
  icon, label, active, detail, sub,
}: {
  icon:   string;
  label:  string;
  active: boolean;
  detail: string;
  sub:    string;
}) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "14px 0",
      borderBottom:   "1px solid #27272a",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "14px", color: "#ffffff", margin: 0, fontWeight: 500 }}>{label}</p>
            <span style={{
              fontSize:     "10px",
              padding:      "2px 8px",
              borderRadius: "99px",
              background:   active ? "#0d1f13" : "#18181b",
              color:        active ? "#4ade80" : "#52525b",
              border:       `1px solid ${active ? "#15803d" : "#27272a"}`,
            }}>
              {active ? "active" : "inactive"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#52525b", margin: "2px 0 0" }}>{sub}</p>
        </div>
      </div>
      <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0, textAlign: "right" }}>{detail}</p>
    </div>
  );
}

export default function PortfolioOverview({ agentId }: { agentId: number }) {
  const { data, isLoading } = useQuery({
    queryKey:        ["portfolio", agentId],
    queryFn:         () => getAgentPortfolio(agentId),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{
        background:     "#18181b",
        borderRadius:   "12px",
        border:         "1px solid #27272a",
        padding:        "20px",
        height:         "200px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        <p style={{ color: "#71717a", fontSize: "13px" }}>Loading portfolio...</p>
      </div>
    );
  }

  if (!data) return null;

  const portfolio: Portfolio = data;
  const pnlPct = (portfolio.performance.totalPnlBps / 100).toFixed(2);
  const isPos  = portfolio.performance.totalPnlBps >= 0;

  const allocatedPct  = Math.min(100, (portfolio.allocated / portfolio.totalBudget) * 100);
  const monitoringPct = Math.min(100 - allocatedPct, 10);

  return (
    <div style={{
      background:   "#18181b",
      borderRadius: "12px",
      border:       "1px solid #27272a",
      padding:      "20px",
    }}>
      <p style={{ fontSize: "12px", color: "#71717a", margin: "0 0 16px" }}>Portfolio overview</p>

      {/* Capital allocation bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          marginBottom:   "8px",
        }}>
          <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>
            Capital — ${portfolio.totalBudget.toLocaleString()} {portfolio.currency} budget
          </p>
          <p style={{
            fontSize:   "13px",
            fontWeight: 500,
            color:      isPos ? "#4ade80" : "#f87171",
            margin:     0,
          }}>
            {isPos ? "+" : ""}{pnlPct}% PnL
          </p>
        </div>

        <div style={{
          display:      "flex",
          height:       "8px",
          borderRadius: "99px",
          overflow:     "hidden",
          background:   "#27272a",
          gap:          "2px",
        }}>
          {allocatedPct > 0 && (
            <div style={{
              width:        `${allocatedPct}%`,
              background:   "#6d28d9",
              borderRadius: "99px 0 0 99px",
            }} />
          )}
          {monitoringPct > 0 && (
            <div style={{
              width:      `${monitoringPct}%`,
              background: "#1d4ed8",
            }} />
          )}
          <div style={{
            flex:         1,
            background:   "#27272a",
            borderRadius: "0 99px 99px 0",
          }} />
        </div>

        <div style={{
          display:   "flex",
          gap:       "16px",
          marginTop: "8px",
          fontSize:  "11px",
          color:     "#52525b",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#6d28d9" }} />
            Allocated (${portfolio.allocated})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#1d4ed8" }} />
            Monitoring
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#27272a" }} />
            Idle (${Math.max(0, portfolio.totalBudget - portfolio.allocated).toFixed(0)})
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #27272a", paddingTop: "16px" }}>

        <AgentRow
          icon="📈"
          label="Signal agent"
          active={portfolio.agents.signal.active}
          detail={
            portfolio.agents.signal.decisions > 0
              ? `${portfolio.agents.signal.winRate}% accuracy · ${portfolio.agents.signal.decisions} settled`
              : "No settled decisions yet"
          }
          sub={
            portfolio.agents.signal.assets.length > 0
              ? `Monitoring ${portfolio.agents.signal.assets.join(", ")}`
              : "No assets configured"
          }
        />

        <AgentRow
          icon="🔀"
          label="Arb scanner"
          active={portfolio.agents.arb.active}
          detail={
            portfolio.agents.arb.lastScan
              ? `Last scan ${new Date(portfolio.agents.arb.lastScan).toLocaleTimeString()}`
              : "Not yet scanned"
          }
          sub="ETH, BTC, AVAX — Avalanche ↔ Kite chain"
        />

        {/* Capital allocator row */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "14px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px" }}>📊</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ fontSize: "14px", color: "#ffffff", margin: 0, fontWeight: 500 }}>Capital allocator</p>
                <span style={{
                  fontSize:     "10px",
                  padding:      "2px 8px",
                  borderRadius: "99px",
                  background:   portfolio.agents.allocation.active ? "#0d1f13" : "#18181b",
                  color:        portfolio.agents.allocation.active ? "#4ade80" : "#52525b",
                  border:       `1px solid ${portfolio.agents.allocation.active ? "#15803d" : "#27272a"}`,
                }}>
                  {portfolio.agents.allocation.active ? "active" : "inactive"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#52525b", margin: "2px 0 0" }}>
                {portfolio.agents.allocation.liveProtocol
                  ? `Best yield: ${portfolio.agents.allocation.liveProtocol}`
                  : "Aave, Morpho, Fluid yield tracking"}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {portfolio.agents.allocation.liveApy ? (
              <>
                <p style={{ fontSize: "16px", fontWeight: 500, color: "#4ade80", margin: 0 }}>
                  {portfolio.agents.allocation.liveApy.toFixed(2)}% APY
                </p>
                <p style={{ fontSize: "11px", color: "#52525b", margin: "2px 0 0" }}>
                  Live rate
                </p>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "#52525b", margin: 0 }}>
                {portfolio.agents.allocation.currentApy
                  ? `${portfolio.agents.allocation.currentApy.toFixed(2)}% APY`
                  : "Fetching yields..."}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
