import express    from "express";
import cors       from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import agentRoutes    from "./routes/agents";
import strategyRoutes from "./routes/strategy";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use("/api/agents",   agentRoutes);
app.use("/api/strategy", strategyRoutes);

// ── Health check ───────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({
    status:  "ok",
    product: "Dragent API",
    chain:   "Kite Testnet (2368)",
  });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🐉 Dragent API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});