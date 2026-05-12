"use client";

import { useQuery }    from "@tanstack/react-query";
import { getAgentPnL } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  timestamp:       string;
  won:             boolean;
  asset:           string;
  direction:       string;
  decision:        number;
  rolling_win_pct: number;
  wins_so_far:     number;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: { payload: DataPoint }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div style={{
      background:   "#18181b",
      border:       "1px solid #27272a",
      borderRadius: "8px",
      padding:      "10px 14px",
      fontSize:     "12px",
    }}>
      <p style={{ color: "#a1a1aa", marginBottom: "4px" }}>
        Decision #{d.decision}
      </p>
      <p style={{ color: d.won ? "#4ade80" : "#f87171", fontWeight: 500, marginBottom: "2px" }}>
        {d.direction} {d.asset} — {d.won ? "✓ Won" : "✗ Lost"}
      </p>
      <p style={{ color: "#ffffff", marginBottom: "2px" }}>
        Accuracy: {d.rolling_win_pct.toFixed(1)}%
      </p>
      <p style={{ color: "#71717a" }}>
        {d.wins_so_far} wins of {d.decision} decisions
      </p>
    </div>
  );
}

export default function AccuracyChart({ agentId }: { agentId: number }) {
  const { data, isLoading } = useQuery({
    queryKey:        ["pnl", agentId],
    queryFn:         () => getAgentPnL(agentId),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{
        height:         "200px",
        background:     "#18181b",
        borderRadius:   "12px",
        border:         "1px solid #27272a",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        <p style={{ color: "#71717a", fontSize: "13px" }}>Loading accuracy data...</p>
      </div>
    );
  }

  const series: DataPoint[] = data?.series ?? [];
  const summary             = data?.summary;

  if (series.length < 2) {
    return (
      <div style={{
        height:         "200px",
        background:     "#18181b",
        borderRadius:   "12px",
        border:         "1px solid #27272a",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "8px",
      }}>
        <p style={{ color: "#71717a", fontSize: "13px" }}>Not enough data yet</p>
        <p style={{ color: "#52525b", fontSize: "11px" }}>
          Accuracy chart appears after 2+ settled decisions
        </p>
      </div>
    );
  }

  const currentAccuracy = series[series.length - 1]?.rolling_win_pct ?? 0;
  const isImproving     = series.length >= 3 &&
    series[series.length - 1].rolling_win_pct >=
    series[series.length - 3].rolling_win_pct;

  return (
    <div style={{
      background:   "#18181b",
      borderRadius: "12px",
      border:       "1px solid #27272a",
      padding:      "20px",
    }}>
      {/* Header */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "flex-start",
        marginBottom:   "16px",
      }}>
        <div>
          <p style={{ fontSize: "12px", color: "#71717a", margin: "0 0 4px" }}>
            Decision accuracy
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <p style={{
              fontSize:   "24px",
              fontWeight: 600,
              color:      currentAccuracy >= 60 ? "#4ade80" : currentAccuracy >= 40 ? "#facc15" : "#f87171",
              margin:     0,
            }}>
              {currentAccuracy.toFixed(1)}%
            </p>
            <span style={{ fontSize: "12px", color: isImproving ? "#4ade80" : "#f87171" }}>
              {isImproving ? "↑ improving" : "↓ declining"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", textAlign: "right" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 2px" }}>Wins</p>
            <p style={{ fontSize: "14px", color: "#4ade80", margin: 0, fontWeight: 500 }}>
              {summary?.wins ?? 0}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 2px" }}>Losses</p>
            <p style={{ fontSize: "14px", color: "#f87171", margin: 0, fontWeight: 500 }}>
              {summary?.losses ?? 0}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 2px" }}>Next tier</p>
            <p style={{ fontSize: "14px", color: "#a1a1aa", margin: 0, fontWeight: 500 }}>
              {currentAccuracy >= 70
                ? "Expert ✓"
                : currentAccuracy >= 65
                  ? "Trader ✓"
                  : currentAccuracy >= 60
                    ? "Apprentice ✓"
                    : `${(60 - currentAccuracy).toFixed(1)}% needed`}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={series} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="decision"
            tick={{ fontSize: 10, fill: "#52525b" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Decision #", position: "insideBottom", offset: -2, fontSize: 10, fill: "#52525b" }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#52525b" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine y={60} stroke="#1d4ed8" strokeDasharray="3 3"
            label={{ value: "Apprentice", position: "right", fontSize: 9, fill: "#1d4ed8" }} />
          <ReferenceLine y={65} stroke="#6d28d9" strokeDasharray="3 3"
            label={{ value: "Trader", position: "right", fontSize: 9, fill: "#6d28d9" }} />
          <ReferenceLine y={70} stroke="#15803d" strokeDasharray="3 3"
            label={{ value: "Expert", position: "right", fontSize: 9, fill: "#15803d" }} />

          <Line
            type="monotone"
            dataKey="rolling_win_pct"
            stroke="#facc15"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={payload.decision}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload.won ? "#4ade80" : "#f87171"}
                  stroke="none"
                />
              );
            }}
            activeDot={{ r: 5, fill: "#facc15" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "11px", color: "#52525b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "8px", height: "2px", background: "#facc15" }} />
          Rolling accuracy
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80" }} />
          Won
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f87171" }} />
          Lost
        </div>
      </div>
    </div>
  );
}
