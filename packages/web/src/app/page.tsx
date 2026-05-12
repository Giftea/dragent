import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-28px) scale(1.03); }
        }
        @keyframes floatDown {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(22px) scale(0.97); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50%       { opacity: 0.7;  transform: scale(1.8); }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 1200; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes scanDown {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── Fixed background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>

        {/* Orb 1 — violet, top-center */}
        <div style={{
          position:   "absolute",
          top:        "-25%",
          left:       "25%",
          width:      "800px",
          height:     "800px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.22) 0%, transparent 68%)",
          filter:     "blur(48px)",
          animation:  "floatUp 14s ease-in-out infinite, orbPulse 8s ease-in-out infinite",
        }} />

        {/* Orb 2 — blue, right side */}
        <div style={{
          position:   "absolute",
          top:        "15%",
          right:      "-18%",
          width:      "650px",
          height:     "650px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 68%)",
          filter:     "blur(48px)",
          animation:  "floatDown 17s ease-in-out infinite, orbPulse 11s ease-in-out infinite 2s",
        }} />

        {/* Orb 3 — emerald, bottom-left */}
        <div style={{
          position:   "absolute",
          bottom:     "5%",
          left:       "-12%",
          width:      "580px",
          height:     "580px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(21,128,61,0.14) 0%, transparent 68%)",
          filter:     "blur(40px)",
          animation:  "floatUp 20s ease-in-out infinite 4s",
        }} />

        {/* Orb 4 — rose accent, upper-right */}
        <div style={{
          position:   "absolute",
          top:        "5%",
          right:      "10%",
          width:      "340px",
          height:     "340px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 68%)",
          filter:     "blur(32px)",
          animation:  "floatDown 11s ease-in-out infinite 1s",
        }} />

        {/* Orb 5 — cyan, mid-page */}
        <div style={{
          position:   "absolute",
          top:        "55%",
          left:       "55%",
          width:      "420px",
          height:     "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 68%)",
          filter:     "blur(36px)",
          animation:  "floatUp 22s ease-in-out infinite 6s",
        }} />

        {/* Dot grid */}
        <svg style={{ position: "absolute", inset: 0, opacity: 0.12 }} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#6d28d9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Subtle grid lines */}
        <svg style={{ position: "absolute", inset: 0, opacity: 0.025 }} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="lines" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lines)" />
        </svg>

        {/* Floating particles */}
        <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          {[
            { cx: "8%",  cy: "12%", r: 2,   color: "#a78bfa", dur: "5s",  delay: "0s"   },
            { cx: "88%", cy: "8%",  r: 1.5, color: "#60a5fa", dur: "7s",  delay: "1.2s" },
            { cx: "72%", cy: "38%", r: 2.5, color: "#4ade80", dur: "6s",  delay: "0.5s" },
            { cx: "22%", cy: "58%", r: 1,   color: "#a78bfa", dur: "8s",  delay: "3s"   },
            { cx: "92%", cy: "65%", r: 2,   color: "#60a5fa", dur: "5.5s",delay: "0.8s" },
            { cx: "38%", cy: "82%", r: 1.5, color: "#4ade80", dur: "9s",  delay: "1.8s" },
            { cx: "58%", cy: "22%", r: 1,   color: "#f472b6", dur: "6.5s",delay: "2.2s" },
            { cx: "12%", cy: "42%", r: 2,   color: "#a78bfa", dur: "7.5s",delay: "4s"   },
            { cx: "78%", cy: "88%", r: 1,   color: "#60a5fa", dur: "5s",  delay: "3.5s" },
            { cx: "48%", cy: "52%", r: 1.5, color: "#4ade80", dur: "8.5s",delay: "1s"   },
            { cx: "95%", cy: "30%", r: 1,   color: "#f472b6", dur: "6s",  delay: "2.7s" },
            { cx: "3%",  cy: "75%", r: 2,   color: "#a78bfa", dur: "7s",  delay: "0.3s" },
            { cx: "65%", cy: "72%", r: 1.5, color: "#60a5fa", dur: "9.5s",delay: "5s"   },
            { cx: "30%", cy: "18%", r: 1,   color: "#4ade80", dur: "5.5s",delay: "1.5s" },
            { cx: "52%", cy: "92%", r: 2,   color: "#f472b6", dur: "8s",  delay: "2s"   },
          ].map((p, i) => (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill={p.color}
              style={{ animation: `twinkle ${p.dur} ease-in-out infinite ${p.delay}` }}
            />
          ))}
        </svg>

        {/* Scan line */}
        <div style={{
          position:   "absolute",
          left:       0,
          right:      0,
          height:     "1px",
          background: "linear-gradient(90deg, transparent, rgba(109,40,217,0.4), rgba(29,78,216,0.4), transparent)",
          animation:  "scanDown 18s linear infinite",
        }} />
      </div>

      {/* ── All page content sits above the background ── */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Nav ── */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-900 sticky top-0 bg-black/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight">Dragent</span>
            <Badge variant="outline" className="text-xs border-zinc-800 text-zinc-500 hidden sm:flex">
              Kite testnet
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/api-docs">
              <button style={{
                background: "none", border: "none", color: "#71717a",
                fontSize: "14px", cursor: "pointer", padding: "6px 12px",
              }}>
                API
              </button>
            </Link>
            <Link href="/dashboard">
              <button style={{
                background: "none", border: "none", color: "#71717a",
                fontSize: "14px", cursor: "pointer", padding: "6px 12px",
              }}>
                Dashboard
              </button>
            </Link>
            <Link href="/launch">
              <button style={{
                background: "white", border: "none", color: "black",
                fontSize: "14px", cursor: "pointer", padding: "8px 20px",
                borderRadius: "8px", fontWeight: 500,
              }}>
                Launch app
              </button>
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{
          padding:    "120px 32px 100px",
          maxWidth:   "1100px",
          margin:     "0 auto",
          textAlign:  "center",
          position:   "relative",
          overflow:   "hidden",
        }}>
          {/* Hero chart SVG — decorative background art */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12, pointerEvents: "none" }}
            viewBox="0 0 1100 500"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#4ade80" stopOpacity="0" />
                <stop offset="30%"  stopColor="#4ade80" stopOpacity="1" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#60a5fa" stopOpacity="0" />
                <stop offset="40%"  stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0" />
                <stop offset="50%"  stopColor="#a78bfa" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines */}
            {[100, 200, 300, 400].map(y => (
              <line key={y} x1="0" y1={y} x2="1100" y2={y} stroke="#27272a" strokeWidth="1" />
            ))}
            {/* Vertical grid lines */}
            {[110, 220, 330, 440, 550, 660, 770, 880, 990].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2="500" stroke="#27272a" strokeWidth="0.5" />
            ))}

            {/* ETH line — ascending green */}
            <path
              d="M 0 420 L 80 400 L 160 410 L 240 380 L 320 360 L 400 340 L 480 310 L 560 290 L 640 260 L 720 240 L 800 210 L 880 185 L 960 160 L 1040 140 L 1100 120"
              stroke="url(#lineGrad1)"
              strokeWidth="2"
              strokeDasharray="1200"
              style={{ animation: "drawLine 4s ease-out forwards 0.5s", strokeDashoffset: 1200 }}
            />
            {/* ETH area fill */}
            <path
              d="M 0 420 L 80 400 L 160 410 L 240 380 L 320 360 L 400 340 L 480 310 L 560 290 L 640 260 L 720 240 L 800 210 L 880 185 L 960 160 L 1040 140 L 1100 120 L 1100 500 L 0 500 Z"
              fill="url(#areaGrad)"
            />

            {/* BTC line — blue */}
            <path
              d="M 0 460 L 80 450 L 160 455 L 240 440 L 320 435 L 400 420 L 480 400 L 560 385 L 640 370 L 720 355 L 800 335 L 880 320 L 960 300 L 1040 285 L 1100 270"
              stroke="url(#lineGrad2)"
              strokeWidth="1.5"
              strokeDasharray="1200"
              style={{ animation: "drawLine 4s ease-out forwards 1.5s", strokeDashoffset: 1200 }}
            />

            {/* SOL line — purple */}
            <path
              d="M 0 480 L 80 475 L 160 470 L 240 460 L 320 455 L 400 445 L 480 430 L 560 415 L 640 405 L 720 390 L 800 375 L 880 360 L 960 345 L 1040 330 L 1100 315"
              stroke="url(#lineGrad3)"
              strokeWidth="1.5"
              strokeDasharray="1200"
              style={{ animation: "drawLine 4s ease-out forwards 2.5s", strokeDashoffset: 1200 }}
            />

            {/* Candlestick bars — subtle */}
            {[
              { x: 150, open: 405, close: 385, high: 378, low: 415 },
              { x: 270, open: 375, close: 355, high: 348, low: 382 },
              { x: 390, open: 338, close: 318, high: 310, low: 345 },
              { x: 510, open: 308, close: 285, high: 278, low: 315 },
              { x: 630, open: 258, close: 242, high: 235, low: 265 },
              { x: 750, open: 238, close: 218, high: 210, low: 245 },
              { x: 870, open: 183, close: 165, high: 158, low: 190 },
            ].map((c, i) => (
              <g key={i}>
                <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke="#4ade80" strokeWidth="1" opacity="0.4" />
                <rect x={c.x - 5} y={c.close} width="10" height={c.open - c.close} fill="#4ade80" opacity="0.3" rx="1" />
              </g>
            ))}

            {/* Data points on ETH line */}
            {[
              { cx: 320, cy: 360 }, { cx: 560, cy: 290 }, { cx: 800, cy: 210 }, { cx: 1040, cy: 140 },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.cx} cy={p.cy} r="4" fill="#4ade80" opacity="0.8" />
                <circle cx={p.cx} cy={p.cy} r="8" fill="#4ade80" opacity="0.15" />
              </g>
            ))}
          </svg>

          {/* Hero content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          "8px",
              border:       "1px solid #27272a",
              borderRadius: "99px",
              padding:      "6px 16px",
              marginBottom: "32px",
              fontSize:     "13px",
              color:        "#71717a",
              background:   "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 8px #4ade80" }} />
              Live on Kite chain — all decisions proven on-chain
            </div>

            <h1 style={{
              fontSize:      "clamp(40px, 6vw, 72px)",
              fontWeight:    500,
              lineHeight:    1.05,
              letterSpacing: "-0.02em",
              marginBottom:  "28px",
              color:         "white",
            }}>
              AI trading infrastructure.<br />
              <span style={{ color: "#52525b" }}>Every decision, verified on-chain.</span>
            </h1>

            <p style={{
              fontSize:    "18px",
              color:       "#71717a",
              maxWidth:    "560px",
              margin:      "0 auto 48px",
              lineHeight:  1.7,
            }}>
              Deploy autonomous agents that monitor markets, detect cross-chain arbitrage,
              and allocate capital across DeFi protocols — with cryptographic proof of every decision on Kite chain.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/launch">
                <button style={{
                  background:   "white",
                  color:        "black",
                  border:       "none",
                  padding:      "14px 32px",
                  borderRadius: "10px",
                  fontSize:     "15px",
                  fontWeight:   500,
                  cursor:       "pointer",
                  boxShadow:    "0 0 32px rgba(255,255,255,0.12)",
                }}>
                  Deploy your agent
                </button>
              </Link>
              <Link href="/passport/2">
                <button style={{
                  background:   "rgba(0,0,0,0.5)",
                  color:        "#a1a1aa",
                  border:       "1px solid #27272a",
                  padding:      "14px 32px",
                  borderRadius: "10px",
                  fontSize:     "15px",
                  cursor:       "pointer",
                  backdropFilter: "blur(8px)",
                }}>
                  View live passport
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Live decision feed mockup ── */}
        <section style={{
          maxWidth: "900px",
          margin:   "0 auto 100px",
          padding:  "0 32px",
        }}>
          <div style={{
            border:       "1px solid #1f1f1f",
            borderRadius: "16px",
            overflow:     "hidden",
            background:   "rgba(10,10,10,0.8)",
            backdropFilter: "blur(16px)",
            boxShadow:    "0 0 80px rgba(109,40,217,0.08), 0 0 40px rgba(29,78,216,0.06)",
          }}>
            {/* Mock browser bar */}
            <div style={{
              padding:      "12px 16px",
              borderBottom: "1px solid #1f1f1f",
              display:      "flex",
              alignItems:   "center",
              gap:          "8px",
            }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27272a" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27272a" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27272a" }} />
              <div style={{
                flex: 1, background: "#111", borderRadius: "6px",
                padding: "4px 12px", fontSize: "12px", color: "#52525b",
                marginLeft: "8px",
              }}>
                dragent.ai/dashboard
              </div>
            </div>

            {/* Mock dashboard */}
            <div style={{ padding: "24px" }}>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "Win rate",     value: "62.5%", sub: "10 of 16" },
                  { label: "Max drawdown", value: "0.8%",  sub: "Controlled" },
                  { label: "Budget limit", value: "$500",  sub: "Tier 1 — Apprentice" },
                  { label: "Decisions",    value: "16",    sub: "All time" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background:   "#111",
                    borderRadius: "10px",
                    padding:      "14px",
                    border:       "1px solid #1f1f1f",
                  }}>
                    <p style={{ fontSize: "11px", color: "#52525b", margin: "0 0 4px" }}>{s.label}</p>
                    <p style={{ fontSize: "20px", fontWeight: 500, color: "white", margin: "0 0 2px" }}>{s.value}</p>
                    <p style={{ fontSize: "11px", color: "#3f3f46", margin: 0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Decision cards */}
              {[
                {
                  badge:      "ARB SCAN",
                  badgeColor: "#1e3a5f",
                  badgeText:  "#60a5fa",
                  asset:      "ETH",
                  price:      "$2,329.18",
                  reason:     "Monitoring cross-chain spread for ETH between Avalanche ($2,329.18) and Kite Chain ($2,331.03) — $1.85 spread insufficient after bridge fees.",
                  time:       "09:14:53",
                  hash:       "0x86efc91d6cf003d4...",
                },
                {
                  badge:      "ALLOCATE",
                  badgeColor: "#2d1b5e",
                  badgeText:  "#a78bfa",
                  asset:      "USDC-aave-v3",
                  price:      "$10.96",
                  reason:     "Allocating to Aave V3 on Ethereum in USDC at 10.96% APY — battle-tested security, $25.7M TVL, medium risk profile preferred over higher-yield alternatives.",
                  time:       "09:12:54",
                  hash:       "0x28e7e46d4a73d5ba...",
                },
              ].map((card, i) => (
                <div key={i} style={{
                  background:   "#111",
                  border:       "1px solid #1f1f1f",
                  borderRadius: "10px",
                  padding:      "16px",
                  marginBottom: "10px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{
                      background:   card.badgeColor,
                      color:        card.badgeText,
                      fontSize:     "10px",
                      fontWeight:   500,
                      padding:      "3px 10px",
                      borderRadius: "99px",
                    }}>
                      {card.badge}
                    </span>
                    <span style={{ color: "white", fontWeight: 500, fontSize: "14px" }}>{card.asset}</span>
                    <span style={{ color: "#52525b", fontSize: "13px" }}>@ {card.price}</span>
                    <span style={{ marginLeft: "auto", color: "#3f3f46", fontSize: "12px" }}>{card.time}</span>
                  </div>
                  <div style={{
                    background:   "#0d0d0d",
                    borderRadius: "8px",
                    padding:      "12px 14px",
                    marginBottom: "10px",
                  }}>
                    <p style={{ fontSize: "11px", color: "#52525b", margin: "0 0 4px" }}>Agent reasoning</p>
                    <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0, lineHeight: 1.5 }}>{card.reason}</p>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#185FA5" }}>View decision proof on Kite</span>
                    <span style={{ fontSize: "12px", color: "#3f3f46", fontFamily: "monospace" }}>Hash: {card.hash}</span>
                    <span style={{ fontSize: "12px", color: "#15803d" }}>✓ Verified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── Three pillars ── */}
        <section style={{ padding: "100px 32px", maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{ fontSize: "12px", color: "#52525b", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
            Built on Kite chain
          </p>
          <h2 style={{ fontSize: "36px", fontWeight: 500, textAlign: "center", marginBottom: "64px", color: "white" }}>
            Three pillars. One infrastructure.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#111" }}>
            {[
              {
                icon:  "📈",
                title: "AI-native signal agent",
                desc:  "Write your strategy in plain English. Claude parses your intent into executable logic. The agent monitors ETH, BTC, SOL, and AVAX every 90 seconds using RSI, trend analysis, and confidence scoring.",
                items: ["Natural language strategy input", "RSI + trend + confidence scoring", "4 assets monitored simultaneously", "Decisions logged to TradeJournal.sol"],
                color: "#15803d",
              },
              {
                icon:  "🔀",
                title: "Cross-chain arb scanner",
                desc:  "Detects price spreads between Avalanche and Kite chain every 5 minutes. Calculates profitability after LayerZero bridge fees and slippage. Logs every opportunity with Claude-generated reasoning.",
                items: ["ETH, BTC, AVAX price comparison", "LayerZero bridge fee calculation", "Profitability threshold filtering", "On-chain opportunity logging"],
                color: "#1d4ed8",
              },
              {
                icon:  "📊",
                title: "Capital allocator",
                desc:  "Monitors yield rates across Aave V3, Morpho Blue, and Fluid every 6 hours. Scores opportunities by risk-adjusted return. Recommends optimal stablecoin allocation with full reasoning.",
                items: ["Live DeFiLlama yield feeds", "Risk-adjusted return scoring", "Aave, Morpho, Fluid coverage", "Allocation decisions on Kite chain"],
                color: "#6d28d9",
              },
            ].map((pillar) => (
              <div key={pillar.title} style={{ background: "rgba(10,10,10,0.9)", padding: "40px 32px" }}>
                <div style={{ fontSize: "24px", marginBottom: "16px" }}>{pillar.icon}</div>
                <h3 style={{ fontSize: "18px", fontWeight: 500, color: "white", marginBottom: "12px" }}>
                  {pillar.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#71717a", lineHeight: 1.7, marginBottom: "24px" }}>
                  {pillar.desc}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pillar.items.map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: pillar.color, flexShrink: 0, boxShadow: `0 0 6px ${pillar.color}` }} />
                      <span style={{ fontSize: "13px", color: "#52525b" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── Reputation system ── */}
        <section style={{ padding: "100px 32px", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
                Reputation system
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: 500, color: "white", marginBottom: "20px", lineHeight: 1.2 }}>
                Trust earned on-chain, not assumed.
              </h2>
              <p style={{ fontSize: "16px", color: "#71717a", lineHeight: 1.7, marginBottom: "32px" }}>
                Every agent starts with a $50 sandbox budget. As decisions settle and performance builds on{" "}
                ReputationRegistry.sol, budget tiers unlock automatically — no human approval, no manual review.
                Your agent&apos;s track record is immutable and portable.
              </p>
              <Link href="/launch">
                <button style={{
                  background:   "transparent",
                  color:        "white",
                  border:       "1px solid #27272a",
                  padding:      "12px 24px",
                  borderRadius: "8px",
                  fontSize:     "14px",
                  cursor:       "pointer",
                }}>
                  Start building reputation →
                </button>
              </Link>
            </div>

            {/* Tier progression visual */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { tier: "Sandbox",    budget: "$50",       req: "No requirements",               color: "#27272a", text: "#71717a", active: false, glow: "none" },
                { tier: "Apprentice", budget: "$500",      req: "60% win rate · 10+ decisions",  color: "#1e3a5f", text: "#60a5fa", active: false, glow: "rgba(96,165,250,0.15)" },
                { tier: "Trader",     budget: "$5,000",    req: "65% win rate · 50+ decisions",  color: "#2d1b5e", text: "#a78bfa", active: false, glow: "rgba(167,139,250,0.15)" },
                { tier: "Expert",     budget: "Unlimited", req: "70% win rate · 200+ decisions", color: "#14532d", text: "#4ade80", active: true,  glow: "rgba(74,222,128,0.15)" },
              ].map((t) => (
                <div key={t.tier} style={{
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "space-between",
                  padding:         "16px 20px",
                  background:      t.active ? "#0d1f13" : "#0a0a0a",
                  border:          `1px solid ${t.active ? "#15803d" : "#1f1f1f"}`,
                  borderRadius:    "10px",
                  boxShadow:       t.active ? "0 0 24px rgba(21,128,61,0.15)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{
                      background:   t.color,
                      color:        t.text,
                      fontSize:     "11px",
                      fontWeight:   500,
                      padding:      "3px 10px",
                      borderRadius: "99px",
                    }}>
                      {t.tier}
                    </span>
                    <span style={{ fontSize: "13px", color: "#52525b" }}>{t.req}</span>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: t.active ? "#4ade80" : "#71717a" }}>
                    {t.budget}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── x402 service provider ── */}
        <section style={{ padding: "100px 32px", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            {/* Code block */}
            <div style={{
              background:   "rgba(10,10,10,0.9)",
              border:       "1px solid #1f1f1f",
              borderRadius: "12px",
              overflow:     "hidden",
              boxShadow:    "0 0 40px rgba(29,78,216,0.06)",
            }}>
              <div style={{
                padding:      "12px 16px",
                borderBottom: "1px solid #1f1f1f",
                display:      "flex",
                alignItems:   "center",
                gap:          "8px",
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27272a" }} />
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27272a" }} />
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27272a" }} />
                <span style={{ fontSize: "12px", color: "#52525b", marginLeft: "8px" }}>x402 payment flow</span>
              </div>
              <div style={{ padding: "20px", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.8 }}>
                <p style={{ color: "#52525b", margin: "0 0 4px" }}># Step 1 — agent calls Dragent endpoint</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 16px" }}>POST /api/strategy/parse</p>

                <p style={{ color: "#52525b", margin: "0 0 4px" }}># Step 2 — Dragent returns 402</p>
                <p style={{ color: "#60a5fa", margin: "0 0 4px" }}>{"{"}</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 4px", paddingLeft: "16px" }}>&quot;scheme&quot;: &quot;gokite-aa&quot;,</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 4px", paddingLeft: "16px" }}>&quot;maxAmountRequired&quot;: &quot;1e18&quot;,</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 4px", paddingLeft: "16px" }}>&quot;asset&quot;: &quot;0x0fF5393...&quot;,</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 16px", paddingLeft: "16px" }}>&quot;merchantName&quot;: &quot;Dragent&quot;</p>
                <p style={{ color: "#60a5fa", margin: "0 0 16px" }}>{"}"}</p>

                <p style={{ color: "#52525b", margin: "0 0 4px" }}># Step 3 — agent pays via Kite Passport</p>
                <p style={{ color: "#a1a1aa", margin: "0 0 16px" }}>X-Payment: {"<signed_auth>"}</p>

                <p style={{ color: "#52525b", margin: "0 0 4px" }}># Step 4 — strategy parsed, rules returned</p>
                <p style={{ color: "#4ade80", margin: 0 }}>200 OK {"{ rules: {...} }"}</p>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "12px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
                x402 service provider
              </p>
              <h2 style={{ fontSize: "36px", fontWeight: 500, color: "white", marginBottom: "20px", lineHeight: 1.2 }}>
                Your agent pays Dragent. No API keys.
              </h2>
              <p style={{ fontSize: "16px", color: "#71717a", lineHeight: 1.7, marginBottom: "32px" }}>
                Dragent exposes AI-powered market intelligence as Kite-native x402 services.
                Any agent with a Kite Passport can pay per use — no subscriptions, no API keys,
                fully autonomous machine-to-machine payments.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                {[
                  { endpoint: "POST /api/strategy/parse",   price: "1 KITE token",   desc: "Parse natural language strategy" },
                  { endpoint: "POST /api/reason/generate",  price: "0.5 KITE token", desc: "Generate verifiable trade reasoning" },
                  { endpoint: "GET  /api/reputation/:addr", price: "0.1 KITE token", desc: "On-chain reputation lookup" },
                ].map((ep) => (
                  <div key={ep.endpoint} style={{
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "space-between",
                    padding:         "12px 16px",
                    background:      "#0a0a0a",
                    border:          "1px solid #1f1f1f",
                    borderRadius:    "8px",
                    gap:             "12px",
                  }}>
                    <div>
                      <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#a1a1aa", margin: "0 0 2px" }}>{ep.endpoint}</p>
                      <p style={{ fontSize: "12px", color: "#52525b", margin: 0 }}>{ep.desc}</p>
                    </div>
                    <span style={{
                      fontSize:     "12px",
                      color:        "#60a5fa",
                      whiteSpace:   "nowrap",
                      background:   "#0c1929",
                      padding:      "3px 10px",
                      borderRadius: "99px",
                    }}>
                      {ep.price}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/api-docs">
                <button style={{
                  background:   "transparent",
                  color:        "white",
                  border:       "1px solid #27272a",
                  padding:      "12px 24px",
                  borderRadius: "8px",
                  fontSize:     "14px",
                  cursor:       "pointer",
                }}>
                  View API docs →
                </button>
              </Link>
            </div>
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── Kite chain integrations ── */}
        <section style={{ padding: "100px 32px", maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{ fontSize: "12px", color: "#52525b", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
            Kite-native infrastructure
          </p>
          <h2 style={{ fontSize: "36px", fontWeight: 500, textAlign: "center", marginBottom: "64px", color: "white" }}>
            Built deep into Kite chain.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#111" }}>
            {[
              { name: "Goldsky subgraph",     desc: "Every trade, arb scan, and allocation decision indexed in real time. Dashboard reads directly from chain — no centralised database for on-chain data.",                                                         tag: "Indexing"    },
              { name: "AA SDK (ERC-4337)",     desc: "Agent transactions submitted as UserOperations via the Kite bundler. Gasless execution, batch operations, upgradeable smart wallets per agent.",                                                               tag: "Execution"   },
              { name: "DUSD gasless relayer",  desc: "Dragent operates its own EIP-3009 gasless relayer for DUSD transfers. Users pay zero gas — the relayer sponsors transactions on their behalf.",                                                                tag: "Gasless"     },
              { name: "TradeJournal.sol",      desc: "Every decision hashed with keccak256 and committed immutably. Plain-English reasons stored on IPFS, hash on Kite. Tamper-proof, verifiable forever.",                                                         tag: "Attestation" },
              { name: "ReputationRegistry.sol",desc: "Win rate, drawdown, and Sharpe proxy tracked per agent on-chain. Budget tiers unlock automatically when thresholds are met — no human approval.",                                                             tag: "Reputation"  },
              { name: "AgentVaultFactory.sol", desc: "One transaction deploys a complete vault with programmable spending rules. Each user gets their own isolated contract — full self-custody.",                                                                   tag: "Vaults"      },
            ].map((item) => (
              <div key={item.name} style={{ background: "rgba(10,10,10,0.9)", padding: "32px" }}>
                <div style={{
                  fontSize:     "11px",
                  color:        "#52525b",
                  background:   "#111",
                  border:       "1px solid #1f1f1f",
                  padding:      "3px 10px",
                  borderRadius: "99px",
                  display:      "inline-block",
                  marginBottom: "16px",
                }}>
                  {item.tag}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 500, color: "white", marginBottom: "10px" }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: "13px", color: "#52525b", lineHeight: 1.7, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── Stats bar ── */}
        <section style={{ padding: "60px 32px" }}>
          <div style={{
            maxWidth:            "900px",
            margin:              "0 auto",
            display:             "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap:                 "1px",
            background:          "#111",
            border:              "1px solid #111",
            borderRadius:        "12px",
            overflow:            "hidden",
          }}>
            {[
              { value: "4",    label: "Smart contracts on Kite" },
              { value: "6",    label: "Kite features integrated" },
              { value: "3",    label: "Agent modes available" },
              { value: "100%", label: "Decisions explained on-chain" },
            ].map((s) => (
              <div key={s.label} style={{
                background: "rgba(10,10,10,0.95)",
                padding:    "32px 24px",
                textAlign:  "center",
              }}>
                <p style={{ fontSize: "32px", fontWeight: 500, color: "white", margin: "0 0 6px" }}>{s.value}</p>
                <p style={{ fontSize: "13px", color: "#52525b", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator style={{ background: "#111", border: "none", height: "1px" }} />

        {/* ── CTA ── */}
        <section style={{ padding: "120px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* CTA background glow */}
          <div style={{
            position:     "absolute",
            inset:        0,
            background:   "radial-gradient(ellipse at center, rgba(109,40,217,0.12) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: "48px", fontWeight: 500, color: "white", marginBottom: "20px", lineHeight: 1.1 }}>
              Your agent. Your rules.<br />
              <span style={{ color: "#52525b" }}>Proven on Kite chain.</span>
            </h2>
            <p style={{ fontSize: "16px", color: "#71717a", maxWidth: "480px", margin: "0 auto 40px", lineHeight: 1.7 }}>
              Join early. Build your agent&apos;s on-chain reputation now.
              Every verified decision today unlocks higher capital tiers when execution goes live.
            </p>
            <Link href="/launch">
              <button style={{
                background:   "white",
                color:        "black",
                border:       "none",
                padding:      "16px 40px",
                borderRadius: "10px",
                fontSize:     "16px",
                fontWeight:   500,
                cursor:       "pointer",
                boxShadow:    "0 0 48px rgba(255,255,255,0.15)",
              }}>
                Deploy your agent
              </button>
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop:       "1px solid #111",
          padding:         "32px",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          flexWrap:        "wrap",
          gap:             "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 500, color: "#a1a1aa" }}>Dragent</span>
            <span style={{ fontSize: "13px", color: "#3f3f46" }}>Built natively on Kite chain</span>
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            {[
              { label: "Explorer",  href: "https://testnet.kitescan.ai" },
              { label: "API docs",  href: "/api-docs" },
              { label: "Passport",  href: "/passport/2" },
              { label: "Dashboard", href: "/dashboard" },
            ].map((link) => (
              <a key={link.label} href={link.href} style={{
                fontSize:       "13px",
                color:          "#3f3f46",
                textDecoration: "none",
              }}>
                {link.label}
              </a>
            ))}
          </div>
        </footer>

      </div>{/* end content wrapper */}
    </main>
  );
}
