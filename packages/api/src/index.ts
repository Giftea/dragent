import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import { query } from "./db";
import { startAgent, startArbAgent, startAllocationAgent } from "./agents/agentRunner";
import agentRoutes from "./routes/agents";
import strategyRoutes from "./routes/strategy";
import telegramRoutes from "./routes/telegram";
import gaslessRoutes from "./routes/gasless";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Routes ──
app.use("/api/agents", agentRoutes);
app.use("/api/strategy", strategyRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/gasless", gaslessRoutes);
// app.use("/api/reputation", require("./routes/reputation").default);

// ── Health check ──
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    product: "Dragent API",
    chain: "Kite Testnet (2368)",
  });
});

// Auto-restart all active agents on server boot
async function resumeActiveAgents() {
  const result = await query("SELECT * FROM agents WHERE status = 'active'");
  for (const agent of result.rows) {
    const modes = agent.agent_modes ?? { signal: true, arb: false, allocation: false };

    if (modes.signal) {
      await startAgent({
        agentId: agent.id,
        agentWallet: agent.wallet,
        vaultAddress: agent.vault_address,
        strategy: agent.strategy,
        privateKey: process.env.PRIVATE_KEY!,
      });
    }
    if (modes.arb) {
      await startArbAgent(agent.id);
    }
    if (modes.allocation) {
      await startAllocationAgent(agent.id);
    }
    console.log(`♻️  Resumed agent ${agent.id} (signal=${modes.signal} arb=${modes.arb} allocation=${modes.allocation})`);
  }
}

app.listen(PORT, async () => {
  console.log(`🐉 Dragent API running on port ${PORT}`);
  await resumeActiveAgents();
});
