"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseStrategy, updateStrategy } from "@/lib/api";

interface Props {
  agentId: number;
  currentStrategy: string;
  onUpdated: () => void;
  onClose: () => void;
}

interface ParsedRules {
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
}

export default function EditStrategyModal({
  agentId,
  currentStrategy,
  onUpdated,
  onClose,
}: Props) {
  const [strategy, setStrategy] = useState(currentStrategy);
  const [rules, setRules] = useState<ParsedRules | null>(null);
  const [step, setStep] = useState<"edit" | "preview" | "saving">("edit");
  const [parsing, setParsing] = useState(false);
  const { toast } = useToast();

  const handleParse = async () => {
    if (!strategy.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseStrategy(strategy);
      setRules(parsed);
      setStep("preview");
    } catch {
      toast({
        title: "Parse failed",
        description: "Could not parse strategy. Try rephrasing.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!rules) return;
    setStep("saving");
    try {
      await updateStrategy(agentId, strategy, rules);
      toast({
        title: "Strategy updated",
        description: "Agent will use new rules on next cycle.",
        variant: "success",
      });
      onUpdated();
      onClose();
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update strategy. Please try again.",
        variant: "destructive",
      });
      setStep("preview");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "12px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "560px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "white",
              margin: 0,
            }}
          >
            Edit strategy
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#71717a",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>

        {/* Edit step */}
        {(step === "edit" || step === "preview") && (
          <>
            <Textarea
              value={strategy}
              onChange={(e) => {
                setStrategy(e.target.value);
                if (step === "preview") setStep("edit");
              }}
              className="min-h-32 bg-zinc-800 border-zinc-700 text-white resize-none mb-3"
              placeholder="Describe your trading strategy in plain English..."
            />

            {step === "edit" && (
              <Button
                className="w-full bg-white text-black hover:bg-zinc-200"
                onClick={handleParse}
                disabled={!strategy.trim() || parsing}
              >
                {parsing ? "Parsing with Claude..." : "Parse strategy →"}
              </Button>
            )}

            {step === "preview" && rules && (
              <>
                <div
                  style={{
                    background: "#27272a",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#71717a",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Parsed rules
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    {[
                      {
                        label: "RSI below",
                        value: rules.entryConditions?.rsiBelow ?? "—",
                      },
                      {
                        label: "Trend",
                        value: rules.entryConditions?.trendRequired ?? "any",
                      },
                      {
                        label: "Stop loss",
                        value: (rules.riskRules?.stopLossPct ?? 0) + "%",
                      },
                      {
                        label: "Take profit",
                        value: (rules.riskRules?.takeProfitPct ?? 0) + "%",
                      },
                      {
                        label: "Assets",
                        value: (rules.assets ?? []).join(", "),
                      },
                      { label: "Direction", value: rules.direction ?? "—" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: "#18181b",
                          borderRadius: "6px",
                          padding: "8px 10px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "10px",
                            color: "#71717a",
                            margin: "0 0 2px",
                          }}
                        >
                          {item.label}
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "white",
                            margin: 0,
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {String(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    variant="outline"
                    className="flex-1 border-zinc-700 text-zinc-300"
                    onClick={() => setStep("edit")}
                  >
                    Edit
                  </Button>
                  <Button
                    className="flex-1 bg-white text-black hover:bg-zinc-200"
                    onClick={handleSave}
                  >
                    Save strategy
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {step === "saving" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "2rem 0",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "2px solid white",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ color: "#a1a1aa", fontSize: "14px" }}>
              Saving strategy...
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
