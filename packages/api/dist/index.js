"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const db_1 = require("./db");
const agentRunner_1 = require("./agents/agentRunner");
const agents_1 = __importDefault(require("./routes/agents"));
const strategy_1 = __importDefault(require("./routes/strategy"));
const telegram_1 = __importDefault(require("./routes/telegram"));
const gasless_1 = __importDefault(require("./routes/gasless"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ── Routes ──
app.use("/api/agents", agents_1.default);
app.use("/api/strategy", strategy_1.default);
app.use("/api/telegram", telegram_1.default);
app.use("/api/gasless", gasless_1.default);
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
    const result = await (0, db_1.query)("SELECT * FROM agents WHERE status = 'active'");
    for (const agent of result.rows) {
        const modes = agent.agent_modes ?? { signal: true, arb: false, allocation: false };
        if (modes.signal) {
            await (0, agentRunner_1.startAgent)({
                agentId: agent.id,
                agentWallet: agent.wallet,
                vaultAddress: agent.vault_address,
                strategy: agent.strategy,
                privateKey: process.env.PRIVATE_KEY,
            });
        }
        if (modes.arb) {
            await (0, agentRunner_1.startArbAgent)(agent.id);
        }
        if (modes.allocation) {
            await (0, agentRunner_1.startAllocationAgent)(agent.id);
        }
        console.log(`♻️  Resumed agent ${agent.id} (signal=${modes.signal} arb=${modes.arb} allocation=${modes.allocation})`);
    }
}
app.listen(PORT, async () => {
    console.log(`🐉 Dragent API running on port ${PORT}`);
    await resumeActiveAgents();
});
