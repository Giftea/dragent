"use client";

import { useState, useEffect }  from "react";
import { useAppKitAccount }     from "@reown/appkit/react";
import { useRouter }            from "next/navigation";
import { Button }               from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea }             from "@/components/ui/textarea";
import { Badge }                from "@/components/ui/badge";
import { Separator }            from "@/components/ui/separator";
import { useToast }             from "@/hooks/use-toast";
import { parseStrategy, createAgent, startAgent, getAgentByWallet, api } from "@/lib/api";

type Step = "connect" | "configure" | "strategy" | "preview" | "deploying" | "done";

type AgentConfig = {
  signal:     boolean;
  arb:        boolean;
  allocation: boolean;
};

interface ParsedRules {
  entryConditions: {
    rsiBelow:       number | null;
    rsiAbove:       number | null;
    priceChangePct: number | null;
    trendRequired:  string | null;
    minConfidence:  number;
  };
  riskRules: {
    maxRiskPctPerTrade: number;
    maxDrawdownPct:     number;
    stopLossPct:        number;
    takeProfitPct:      number;
  };
  assets:    string[];
  direction: string;
}

const AGENT_TYPES = [
  {
    key:         "signal" as const,
    icon:        "📈",
    title:       "Signal Agent",
    description: "Monitors ETH, BTC, SOL, AVAX using RSI and trend analysis. Logs verifiable buy/sell signals on Kite chain.",
    badge:       "Core",
    badgeClass:  "bg-green-500/10 text-green-400 border-green-500/20",
  },
  {
    key:         "arb" as const,
    icon:        "🔀",
    title:       "Arb Scanner",
    description: "Detects cross-chain price spreads between Avalanche and Kite chain every 5 minutes. Logs profitable opportunities.",
    badge:       "Cross-chain",
    badgeClass:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    key:         "allocation" as const,
    icon:        "📊",
    title:       "Capital Allocator",
    description: "Monitors yield rates across Aave, Morpho, Fluid every 6 hours. Recommends optimal stablecoin allocation.",
    badge:       "DeFi",
    badgeClass:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
];

export default function LaunchPage() {
  const { address, isConnected } = useAppKitAccount();
  const router                   = useRouter();
  const { toast }                = useToast();

  const [step,        setStep]        = useState<Step>("connect");
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    signal: true, arb: false, allocation: false,
  });
  const [strategy,  setStrategy]  = useState("");
  const [rules,     setRules]     = useState<ParsedRules | null>(null);
  const [parsing,   setParsing]   = useState(false);
  const [agentData, setAgentData] = useState<{
    agentId:      number;
    agentWallet:  string;
    vaultAddress: string;
  } | null>(null);

  useEffect(() => {
    if (isConnected && address && step === "connect") {
      getAgentByWallet(address)
        .then((data) => {
          if (data?.agentId) router.push("/dashboard");
        })
        .catch(() => setStep("configure"));
    }
  }, [isConnected, address, step]);

  const handleParseStrategy = async () => {
    if (!strategy.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseStrategy(strategy);
      setRules(parsed);
      setStep("preview");
    } catch {
      toast({ title: "Parse failed", description: "Try rephrasing your strategy.", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleDeploy = async () => {
    if (!address) return;
    setStep("deploying");

    try {
      const finalStrategy = agentConfig.signal && strategy
        ? strategy
        : "Monitor ETH, BTC, SOL and AVAX. Signal buy when RSI drops below 32 and trend is bearish. Stop loss 5%, take profit 15%.";

      const finalRules = rules ?? {
        entryConditions: { rsiBelow: 32, rsiAbove: null, priceChangePct: null, trendRequired: null, minConfidence: 50 },
        riskRules:       { maxRiskPctPerTrade: 2, maxDrawdownPct: 10, stopLossPct: 5, takeProfitPct: 15 },
        assets:          ["ETH", "BTC", "SOL", "AVAX"],
        direction:       "long",
      };

      const agent = await createAgent({
        walletAddress: address,
        strategy:      finalStrategy,
        rules:         finalRules,
      });

      if (agentConfig.signal) {
        await startAgent(agent.agentId);
      }
      if (agentConfig.arb) {
        await api.post(`/api/agents/${agent.agentId}/arb/start`);
      }
      if (agentConfig.allocation) {
        await api.post(`/api/agents/${agent.agentId}/allocation/start`);
      }

      setAgentData(agent);
      setStep("done");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deployment failed";
      toast({ title: "Deployment failed", description: message, variant: "destructive" });
      setStep("preview");
    }
  };

  const visibleSteps: Step[] = agentConfig.signal
    ? ["connect", "configure", "strategy", "preview", "deploying", "done"]
    : ["connect", "configure", "deploying", "done"];

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <a href="/" className="text-lg font-semibold tracking-tight">Dragent</a>
        <appkit-button />
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Progress */}
        <div className="flex items-center gap-3 mb-12">
          {visibleSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                ${step === s
                  ? "bg-white text-black"
                  : visibleSteps.indexOf(step) > i
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                }`}>
                {i + 1}
              </div>
              {i < visibleSteps.length - 1 && (
                <div className="w-8 h-px bg-zinc-800" />
              )}
            </div>
          ))}
        </div>

        {/* ── Connect ── */}
        {step === "connect" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Connect your wallet</CardTitle>
              <CardDescription className="text-zinc-400">
                Your wallet is your identity on Dragent. Each address gets one agent vault on Kite chain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <appkit-button />
            </CardContent>
          </Card>
        )}

        {/* ── Configure ── */}
        {step === "configure" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Choose your agent</CardTitle>
              <CardDescription className="text-zinc-400">
                Select which capabilities to activate. You can change these later from your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {AGENT_TYPES.map((type) => (
                <div
                  key={type.key}
                  onClick={() => setAgentConfig(prev => ({ ...prev, [type.key]: !prev[type.key] }))}
                  style={{
                    border:       `1.5px solid ${agentConfig[type.key] ? "white" : "#27272a"}`,
                    borderRadius: "10px",
                    padding:      "16px",
                    cursor:       "pointer",
                    background:   agentConfig[type.key] ? "#18181b" : "transparent",
                    transition:   "all 0.15s",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      background: "#27272a", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "18px", flexShrink: 0,
                    }}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm">{type.title}</p>
                        <Badge className={`text-xs ${type.badgeClass}`}>{type.badge}</Badge>
                        {agentConfig[type.key] && (
                          <span className="ml-auto text-green-400 text-xs">✓ Selected</span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!agentConfig.signal && !agentConfig.arb && !agentConfig.allocation && (
                <p className="text-xs text-red-400 text-center">Select at least one agent type</p>
              )}

              <Separator className="bg-zinc-800" />

              <Button
                className="bg-white text-black hover:bg-zinc-200 w-full"
                disabled={!agentConfig.signal && !agentConfig.arb && !agentConfig.allocation}
                onClick={() => agentConfig.signal ? setStep("strategy") : setStep("preview")}
              >
                Continue →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Strategy ── */}
        {step === "strategy" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Write your strategy</CardTitle>
              <CardDescription className="text-zinc-400">
                Describe your market monitoring rules in plain English. Claude parses your intent into executable logic.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                placeholder={`Examples:\n"Buy ETH when RSI drops below 30. Never risk more than 2% per decision."\n\n"Monitor BTC, ETH and SOL. Signal buy when RSI is below 35 and trend is bearish."\n\n"Watch AVAX when RSI drops below 28. Stop loss 4%, take profit 12%."`}
                className="min-h-40 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              />
              <p className="text-xs text-zinc-500">Supported assets: ETH, BTC, SOL, AVAX, BNB, ARB</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                  onClick={() => setStep("configure")}
                >
                  Back
                </Button>
                <Button
                  className="bg-white text-black hover:bg-zinc-200 flex-1"
                  onClick={handleParseStrategy}
                  disabled={!strategy.trim() || parsing}
                >
                  {parsing ? "Parsing with Claude..." : "Parse strategy →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Preview ── */}
        {step === "preview" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Review your configuration</CardTitle>
              <CardDescription className="text-zinc-400">
                Confirm your agent setup before deploying to Kite chain.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Active agents</p>
                <div className="flex flex-wrap gap-2">
                  {agentConfig.signal     && <Badge className="bg-green-500/10 text-green-400 border-green-500/20">📈 Signal Agent</Badge>}
                  {agentConfig.arb        && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">🔀 Arb Scanner</Badge>}
                  {agentConfig.allocation && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">📊 Capital Allocator</Badge>}
                </div>
              </div>

              {agentConfig.signal && strategy && (
                <>
                  <Separator className="bg-zinc-800" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Strategy</p>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-sm text-zinc-300 leading-relaxed">{strategy}</p>
                    </div>
                  </div>

                  {rules && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Parsed rules</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "RSI entry below", value: rules.entryConditions?.rsiBelow ?? "—" },
                          { label: "Trend required",  value: rules.entryConditions?.trendRequired ?? "any" },
                          { label: "Stop loss",       value: (rules.riskRules?.stopLossPct ?? 0) + "%" },
                          { label: "Take profit",     value: (rules.riskRules?.takeProfitPct ?? 0) + "%" },
                          { label: "Assets",          value: (rules.assets ?? []).join(", ") },
                          { label: "Direction",       value: rules.direction ?? "—" },
                        ].map((item) => (
                          <div key={item.label} className="bg-zinc-800 rounded-md px-3 py-2">
                            <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                            <p className="text-sm text-white font-medium capitalize">{String(item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <Separator className="bg-zinc-800" />

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">What deploys</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-sm text-zinc-300">AgentVault on Kite — capital vault with spending rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-sm text-zinc-300">Reputation passport on ReputationRegistry</span>
                  </div>
                  {agentConfig.signal && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-sm text-zinc-300">Signal agent — monitors ETH, BTC, SOL, AVAX</span>
                    </div>
                  )}
                  {agentConfig.arb && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-sm text-zinc-300">Arb scanner — Avalanche ↔ Kite cross-chain spreads</span>
                    </div>
                  )}
                  {agentConfig.allocation && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span className="text-sm text-zinc-300">Capital allocator — Aave, Morpho, Fluid yield tracking</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300"
                  onClick={() => agentConfig.signal ? setStep("strategy") : setStep("configure")}
                >
                  Back
                </Button>
                <Button
                  className="bg-white text-black hover:bg-zinc-200 flex-1"
                  onClick={handleDeploy}
                >
                  Deploy agent →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Deploying ── */}
        {step === "deploying" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center gap-6 py-16">
              <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium mb-2">Deploying your agent</p>
                <p className="text-zinc-400 text-sm">
                  Creating your vault on Kite chain and starting your selected agents.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {([
                  "Generating agent wallet",
                  "Deploying AgentVault on Kite",
                  "Registering on ReputationRegistry",
                  agentConfig.signal     ? "Starting signal agent"      : null,
                  agentConfig.arb        ? "Starting arb scanner"       : null,
                  agentConfig.allocation ? "Starting capital allocator"  : null,
                ] as (string | null)[]).filter(Boolean).map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                    <span className="text-xs text-zinc-500">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Done ── */}
        {step === "done" && agentData && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center gap-6 py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-3xl">🐉</span>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-semibold mb-2">Your agent is live</p>
                <p className="text-zinc-400 text-sm max-w-sm">
                  Dragent is now running autonomously on Kite chain.
                  {agentConfig.signal     && " Monitoring markets for signals."}
                  {agentConfig.arb        && " Scanning cross-chain arb opportunities."}
                  {agentConfig.allocation && " Tracking DeFi yields."}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap justify-center">
                {agentConfig.signal     && <Badge className="bg-green-500/10 text-green-400 border-green-500/20">📈 Signal active</Badge>}
                {agentConfig.arb        && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">🔀 Arb active</Badge>}
                {agentConfig.allocation && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">📊 Allocation active</Badge>}
              </div>

              <div className="w-full flex flex-col gap-3 bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Vault address</span>
                  <a
                    href={`https://testnet.kitescan.ai/address/${agentData.vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline font-mono"
                  >
                    {agentData.vaultAddress.slice(0, 10)}...{agentData.vaultAddress.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Agent wallet</span>
                  <span className="text-xs text-zinc-300 font-mono">
                    {agentData.agentWallet.slice(0, 10)}...{agentData.agentWallet.slice(-8)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 flex-1"
                  onClick={() => router.push(`/passport/${agentData.agentId}`)}
                >
                  View passport
                </Button>
                <Button
                  className="bg-white text-black hover:bg-zinc-200 flex-1"
                  onClick={() => router.push("/dashboard")}
                >
                  Open dashboard →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
