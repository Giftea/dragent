"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { parseStrategy, createAgent, startAgent } from "@/lib/api";
import { AppKitButton } from "@reown/appkit/react";
import { getAgentByWallet } from "@/lib/api";
import { useAppKitAccount } from "@reown/appkit/react";

type Step = "connect" | "strategy" | "preview" | "deploying" | "done";

export default function LaunchPage() {
  const { address, isConnected } = useAppKitAccount();
  const router = useRouter();
  const [step, setStep] = useState<Step>("connect");
  const [strategy, setStrategy] = useState("");
  const [rules, setRules] = useState<{
    entryConditions: {
      rsiBelow: number | null;
      rsiAbove: number | null;
      priceChangePct: number | null;
      trendRequired: string | null;
      minConfidence: number;
    };
    riskRules: {
      maxRiskPctPerTrade: number;
      maxDrawdownPct: number;
      stopLossPct: number;
      takeProfitPct: number;
    };
    assets: string[];
    direction: string;
  } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [agentData, setAgentData] = useState<{
    agentId: number;
    agentWallet: string;
    vaultAddress: string;
  } | null>(null);

  // ── Step 1: wallet connected → move to strategy ───────
  const handleWalletConnected = () => {
    if (isConnected) setStep("strategy");
  };

  // ── Step 2: parse strategy via Claude ────────────────
  const handleParseStrategy = async () => {
    if (!strategy.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseStrategy(strategy);
      setRules(parsed);
      setStep("preview");
    } catch {
      toast.error("Parse failed", {
        description: "Could not parse your strategy. Try rephrasing it.",
      });
    } finally {
      setParsing(false);
    }
  };

  // ── Step 3: deploy agent + vault on Kite ─────────────
  const handleDeploy = async () => {
    if (!address || !rules) return;
    setStep("deploying");
    try {
      const agent = await createAgent({
        walletAddress: address,
        strategy,
        rules: rules as unknown,
      });
      await startAgent(agent.agentId);
      setAgentData(agent);
      setStep("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deployment failed";
      toast.error("Deployment failed", { description: message });
      setStep("preview");
    }
  };

  useEffect(() => {
    if (isConnected && address && step === "connect") {
      checkExistingAgent();
    }
  }, [isConnected, address, step]);

  const checkExistingAgent = async () => {
    try {
      const data = await getAgentByWallet(address!);
      if (data?.agentId) {
        router.push(`/dashboard/${data.agentId}`);
      }
    } catch {
      setStep("strategy");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <a href="/" className="text-lg font-semibold tracking-tight">
          Dragent
        </a>
        {/* <ConnectButton /> */}
        <AppKitButton />
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-12">
          {(
            ["connect", "strategy", "preview", "deploying", "done"] as Step[]
          ).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                  ${
                    step === s
                      ? "bg-white text-black"
                      : [
                          "connect",
                          "strategy",
                          "preview",
                          "deploying",
                          "done",
                        ].indexOf(step) > i
                      ? "bg-zinc-700 text-zinc-300"
                      : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                  }`}
              >
                {i + 1}
              </div>
              {i < 4 && <div className="w-8 h-px bg-zinc-800" />}
            </div>
          ))}
        </div>

        {/* ── Step: Connect wallet ─────────────────────── */}
        {step === "connect" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Connect your wallet</CardTitle>
              <CardDescription className="text-zinc-400">
                Your wallet is your identity on Dragent. Each address gets one
                agent and one vault on Kite chain.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* ── Step: Write strategy ─────────────────────── */}
        {step === "strategy" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Write your strategy</CardTitle>
              <CardDescription className="text-zinc-400">
                Describe your market monitoring rules in plain English. Claude
                will parse your intent into executable logic your agent runs
                autonomously.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                placeholder={`Examples:\n"Buy ETH when RSI drops below 30. Never risk more than 2% per decision."\n\n"Monitor BTC, ETH, and SOL. Signal buy when RSI is below 35 and trend is bearish."\n\n"Watch AVAX when RSI drops below 28. Stop loss 4%, take profit 12%."`}
                className="min-h-40 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Be specific about entry conditions, risk limits, and assets. The
                more detail, the better the agent performs.
              </p>
              <Button
                className="bg-white text-black hover:bg-zinc-200 w-full"
                onClick={handleParseStrategy}
                disabled={!strategy.trim() || parsing}
              >
                {parsing ? "Parsing with Claude..." : "Parse strategy →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step: Preview parsed rules ───────────────── */}
        {step === "preview" && rules && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Review your strategy</CardTitle>
              <CardDescription className="text-zinc-400">
                Claude parsed your strategy into these rules. Confirm before
                deploying.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Original strategy */}
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-xs text-zinc-500 mb-2">Your strategy</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {strategy}
                </p>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Parsed rules */}
              {/* Parsed rules */}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  Parsed rules
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "RSI entry below",
                      value: rules.entryConditions?.rsiBelow ?? "—",
                    },
                    {
                      label: "Trend required",
                      value: rules.entryConditions?.trendRequired ?? "any",
                    },
                    {
                      label: "Min confidence",
                      value: (rules.entryConditions?.minConfidence ?? 0) + "%",
                    },
                    {
                      label: "Max risk/trade",
                      value: (rules.riskRules?.maxRiskPctPerTrade ?? 0) + "%",
                    },
                    {
                      label: "Stop loss",
                      value: (rules.riskRules?.stopLossPct ?? 0) + "%",
                    },
                    {
                      label: "Take profit",
                      value: (rules.riskRules?.takeProfitPct ?? 0) + "%",
                    },
                    { label: "Assets", value: (rules.assets ?? []).join(", ") },
                    { label: "Direction", value: rules.direction ?? "—" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-1 bg-zinc-800 rounded-md px-3 py-2"
                    >
                      <span className="text-xs text-zinc-500">
                        {item.label}
                      </span>
                      <span className="text-sm text-white font-medium capitalize">
                        {String(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* What gets deployed */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  What deploys
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-sm text-zinc-300">
                    AgentVault on Kite — your capital vault with spending rules
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-sm text-zinc-300">
                    Agent wallet with programmable decision limits
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-sm text-zinc-300">
                    Reputation passport on ReputationRegistry — builds over time
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 flex-1"
                  onClick={() => setStep("strategy")}
                >
                  Edit strategy
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

        {/* ── Step: Deploying ───────────────────────────── */}
        {step === "deploying" && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center gap-6 py-16">
              <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium mb-2">
                  Deploying your agent
                </p>
                <p className="text-zinc-400 text-sm">
                  Deploying your AgentVault to Kite testnet. This takes 10–15
                  seconds.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {[
                  "Generating agent wallet",
                  "Deploying AgentVault on Kite",
                  "Registering on ReputationRegistry",
                  "Starting agent process",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                    <span className="text-xs text-zinc-500">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step: Done ────────────────────────────────── */}
        {step === "done" && agentData && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center gap-6 py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-3xl">🐉</span>
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-semibold mb-2">
                  Your agent is live
                </p>
                <p className="text-zinc-400 text-sm max-w-sm">
                  Dragent is now monitoring markets and will log verifiable
                  decisions autonomously based on your strategy. Every decision
                  is proven on Kite chain.
                </p>
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
                    {agentData.vaultAddress.slice(0, 10)}...
                    {agentData.vaultAddress.slice(-8)}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Agent wallet</span>
                  <span className="text-xs text-zinc-300 font-mono">
                    {agentData.agentWallet.slice(0, 10)}...
                    {agentData.agentWallet.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Status</span>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    Active
                  </Badge>
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
                  onClick={() => router.push(`/dashboard/${agentData.agentId}`)}
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
