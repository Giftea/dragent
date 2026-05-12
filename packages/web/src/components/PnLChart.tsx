"use client";

import { useQuery } from "@tanstack/react-query";
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

interface PnLPoint {
  timestamp:      string;
  pnl_bps:        number;
  cumulative_bps: number;
  won:            boolean;
  asset:          string;
  direction:      string;
}

interface CustomTooltipProps {
  active?:  boolean;
  payload?: { payload: PnLPoint }[];
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
        {new Date(d.timestamp).toLocaleString()}
      </p>
      <p style={{ color: d.won ? "#4ade80" : "#f87171", fontWeight: 500 }}>
        {d.won ? "+" : ""}{(d.pnl_bps / 100).toFixed(2)}% {d.won ? "✓" : "✗"}
      </p>
      <p style={{ color: "#ffffff" }}>
        Cumulative: {(d.cumulative_bps / 100).toFixed(2)}%
      </p>
      <p style={{ color: "#71717a" }}>
        {d.direction} {d.asset}
      </p>
    </div>
  );
}

export default function PnLChart({ agentId }: { agentId: number }) {
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
        <p style={{ color: "#71717a", fontSize: "13px" }}>Loading PnL data...</p>
      </div>
    );
  }

  const series: PnLPoint[] = data?.series ?? [];
  const summary = data?.summary;

  if (series.length === 0) {
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
        <p style={{ color: "#71717a", fontSize: "13px" }}>No settled decisions yet</p>
        <p style={{ color: "#52525b", fontSize: "11px" }}>
          PnL chart will appear after decisions settle (5–10 min after each signal)
        </p>
      </div>
    );
  }

  const totalPnl   = summary?.totalPnlBps ?? 0;
  const isPositive = totalPnl >= 0;
  const lineColor  = isPositive ? "#4ade80" : "#f87171";
  const chartData  = series.map((p, i) => ({ ...p, index: i + 1 }));

  return (
    <div style={{
      background:   "#18181b",
      borderRadius: "12px",
      border:       "1px solid #27272a",
      padding:      "20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "12px", color: "#71717a", margin: "0 0 4px" }}>Cumulative PnL</p>
          <p style={{
            fontSize:   "24px",
            fontWeight: 600,
            color:      isPositive ? "#4ade80" : "#f87171",
            margin:     0,
          }}>
            {isPositive ? "+" : ""}{(totalPnl / 100).toFixed(2)}%
          </p>
        </div>
        <div style={{ display: "flex", gap: "16px", textAlign: "right" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 2px" }}>Decisions</p>
            <p style={{ fontSize: "14px", color: "#ffffff", margin: 0, fontWeight: 500 }}>
              {summary?.totalDecisions ?? 0}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 2px" }}>Win / Loss</p>
            <p style={{ fontSize: "14px", margin: 0, fontWeight: 500 }}>
              <span style={{ color: "#4ade80" }}>{summary?.wins ?? 0}</span>
              <span style={{ color: "#52525b" }}> / </span>
              <span style={{ color: "#f87171" }}>{summary?.losses ?? 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fontSize: 10, fill: "#52525b" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Decision #", position: "insideBottom", offset: -2, fontSize: 10, fill: "#52525b" }}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 100).toFixed(1)}%`}
            tick={{ fontSize: 10, fill: "#52525b" }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="cumulative_bps"
            stroke={lineColor}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={payload.index}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload.won ? "#4ade80" : "#f87171"}
                  stroke="none"
                />
              );
            }}
            activeDot={{ r: 5, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
