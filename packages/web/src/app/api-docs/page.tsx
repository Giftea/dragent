import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
        <a href="/" className="text-lg font-semibold tracking-tight">
          Dragent
        </a>
        <Badge
          variant="outline"
          className="border-zinc-700 text-zinc-400 text-xs"
        >
          API docs
        </Badge>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col gap-10">
        <div>
          <h1 className="text-3xl font-semibold mb-3">Dragent API</h1>
          <p className="text-zinc-400 leading-relaxed">
            Dragent exposes AI-powered market intelligence as x402-compatible
            endpoints. Any AI agent on Kite chain can pay for and call these
            services autonomously — no API keys, no subscriptions,
            stablecoin-first settlement.
          </p>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              x402
            </Badge>
            <h2 className="text-lg font-medium">Payment protocol</h2>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            All paid endpoints follow the x402 protocol. Requests without
            payment return a{" "}
            <code className="bg-zinc-800 px-1 rounded text-xs">
              402 Payment Required
            </code>{" "}
            response with payment details. Retry with the{" "}
            <code className="bg-zinc-800 px-1 rounded text-xs">X-Payment</code>{" "}
            header to access the service.
          </p>
          {/* <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-400">
            <p className="text-zinc-500 mb-2">
              # Step 1 — hit endpoint, receive 402
            </p>
            <p>POST /api/strategy/parse</p>
            <p className="mt-2 text-zinc-500">
              # Step 2 — get payer address via Kite MCP
            </p>
            <p>get_payer_addr()</p>
            <p className="mt-2 text-zinc-500">
              # Step 3 — approve payment via Kite MCP
            </p>
            <p>approve_payment(payee, amount, "PYUSD")</p>
            <p className="mt-2 text-zinc-500">
              # Step 4 — retry with X-Payment header
            </p>
            <p>POST /api/strategy/parse -H "X-Payment: &lt;auth&gt;"</p>
          </div> */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-400">
            <p className="text-zinc-500 mb-2">
              # Install Kite Passport in Claude Code or Codex
            </p>
            <p>curl -fsSL https://agentpassport.ai/install.sh | bash</p>
            <p className="mt-2 text-zinc-500"># Then tell your agent:</p>
            <p>
              "Pay for and call the Dragent strategy parser at {API_BASE_URL}
              /api/strategy/parse"
            </p>
            <p className="mt-2 text-zinc-500">
              # Your agent handles the rest automatically
            </p>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-medium">Endpoints</h2>

          {[
            {
              method: "POST",
              path: "/api/strategy/parse",
              price: "0.10 PYUSD",
              description:
                "Parse a natural language trading strategy into executable rules. Powered by Claude AI.",
              body: `{ "strategy": "Buy ETH when RSI drops below 30..." }`,
              response: `{ "rules": { "entryConditions": {...}, "riskRules": {...} } }`,
            },
            {
              method: "POST",
              path: "/api/reason/generate",
              price: "0.05 PYUSD",
              description:
                "Generate a plain-English trade reason with on-chain verifiable hash. Powered by Claude AI.",
              body: `{ "asset": "ETH", "price": 2087, "rsi": 29.5, "action": "BUY", "strategy": "..." }`,
              response: `{ "reason": "Buying ETH because...", "reasonHash": "0x..." }`,
            },
            {
              method: "GET",
              path: "/api/agents/reputation/:address",
              price: "0.01 PYUSD",
              description:
                "Look up an agent's on-chain reputation score, win rate, tier, and budget limit from ReputationRegistry.sol.",
              body: null,
              response: `{ "totalTrades": 13, "winRateBps": 7500, "tier": 1, "budgetLimit": "500000000" }`,
            },
          ].map((ep) => (
            <div
              key={ep.path}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-xs">
                  {ep.method}
                </Badge>
                <code className="text-white text-sm">{ep.path}</code>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs ml-auto">
                  {ep.price}
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm">{ep.description}</p>
              {ep.body && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Request body</p>
                  <code className="text-xs text-zinc-400 bg-zinc-800 rounded p-2 block">
                    {ep.body}
                  </code>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-600 mb-1">Response</p>
                <code className="text-xs text-zinc-400 bg-zinc-800 rounded p-2 block">
                  {ep.response}
                </code>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Settlement</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Token", value: "PYUSD" },
              { label: "Network", value: "Kite testnet (2368)" },
              { label: "Payee", value: "0x6F82eC71...c862c7" },
              { label: "Protocol", value: "x402 + Kite MCP" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                <p className="text-sm font-mono text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-zinc-600 text-sm">
            Dragent is built natively on Kite chain.
          </p>
          <div className="flex gap-4">
            <a
              href="https://testnet.kitescan.ai/address/0x94e7DAaeB4d28fF2e71912fd06818b41009de47e"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              TradeJournal.sol ↗
            </a>
            <a
              href="https://testnet.kitescan.ai/address/0x489A1C099971A14E793D2b38E07436ce7c1577C2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              ReputationRegistry.sol ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
