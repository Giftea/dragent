import Anthropic from "@anthropic-ai/sdk";
import {
  fetchProtocolYields,
  findBestYield,
  type ProtocolYield,
  type AllocationDecision,
} from "./protocolMonitor";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generateAllocationReason(
  best:         ProtocolYield,
  alternatives: ProtocolYield[]
): Promise<string> {
  const altSummary = alternatives
    .slice(0, 3)
    .map(a => `${a.protocol} (${a.apy}% APY, ${a.risk} risk)`)
    .join(", ");

  const message = await anthropic.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{
      role:    "user",
      content: `You are an autonomous DeFi capital allocation agent. Write one clear sentence explaining this allocation decision. Be specific with numbers.

Best yield found:
- Protocol: ${best.protocol}
- Chain: ${best.chain}
- Asset: ${best.asset}
- APY: ${best.apy}%
- TVL: $${(best.tvl / 1e6).toFixed(1)}M
- Risk: ${best.risk}

Alternatives considered: ${altSummary || "none"}

Write ONE sentence starting with "Allocating". Cite the protocol, APY, and why it was chosen over alternatives. No preamble.`,
    }],
  });

  return (message.content[0] as { text: string }).text
    .trim()
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
}

export async function analyzeAllocation(
  maxRisk:        "low" | "medium" | "high" = "medium",
  preferredAsset: string = "USDC"
): Promise<AllocationDecision | null> {
  console.log("📊 Fetching DeFi protocol yields...");
  const yields = await fetchProtocolYields();

  if (yields.length === 0) {
    console.warn("No yields found");
    return null;
  }

  console.log(`   Found ${yields.length} eligible pools`);
  yields.slice(0, 5).forEach(y => {
    console.log(
      `   ${y.protocol} (${y.chain}): ${y.apy}% APY, ${y.risk} risk, $${(y.tvl / 1e6).toFixed(0)}M TVL`
    );
  });

  const best = findBestYield(yields, maxRisk, preferredAsset);
  if (!best) {
    console.warn("No suitable yield found within risk tolerance");
    return null;
  }

  const alternatives = yields.filter(y => y.address !== best.address);
  const reason       = await generateAllocationReason(best, alternatives);
  const confidence   = best.risk === "low" ? 85 : best.risk === "medium" ? 65 : 45;

  return {
    recommended:  best,
    alternatives: alternatives.slice(0, 5),
    reason,
    confidence,
    timestamp:    Date.now(),
  };
}
