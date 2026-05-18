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
exports.requirePayment = requirePayment;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const PIEVERSE_FACILITATOR = "https://facilitator.pieverse.io";
const PAYEE_ADDRESS = process.env.DRAGENT_PAYEE_ADDRESS;
const PAYMENT_ASSET = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
// ── Output schemas per endpoint ───────────────────────────
const OUTPUT_SCHEMAS = {
    "/api/strategy/parse": {
        input: {
            discoverable: true,
            method: "POST",
            queryParams: {},
            bodyParams: {
                strategy: {
                    description: "Natural language trading strategy",
                    required: true,
                    type: "string"
                }
            },
            type: "http"
        },
        output: {
            properties: {
                rules: {
                    description: "Parsed trading rules including entry conditions and risk parameters",
                    type: "object"
                }
            },
            required: ["rules"],
            type: "object"
        }
    },
    "/api/reason/generate": {
        input: {
            discoverable: true,
            method: "POST",
            queryParams: {},
            bodyParams: {
                asset: { description: "Asset symbol e.g. ETH, BTC", required: true, type: "string" },
                price: { description: "Current price in USD", required: true, type: "number" },
                rsi: { description: "RSI indicator value", required: true, type: "number" },
                action: { description: "BUY or SELL", required: true, type: "string" },
                strategy: { description: "Trading strategy text", required: true, type: "string" },
                sizeUSDC: { description: "Trade size in USDC", required: false, type: "number" },
            },
            type: "http"
        },
        output: {
            properties: {
                reason: { description: "Plain-English trade reasoning", type: "string" },
                reasonHash: { description: "Keccak256 hash for on-chain proof", type: "string" }
            },
            required: ["reason", "reasonHash"],
            type: "object"
        }
    },
    "/api/agents/reputation/:address": {
        input: {
            discoverable: true,
            method: "GET",
            queryParams: {
                address: {
                    description: "Agent wallet address",
                    required: true,
                    type: "string"
                }
            },
            type: "http"
        },
        output: {
            properties: {
                totalTrades: { description: "Total number of trades", type: "number" },
                winRateBps: { description: "Win rate in basis points", type: "number" },
                tier: { description: "Reputation tier 0-3", type: "number" },
                budgetLimit: { description: "Current budget limit in USDC wei", type: "string" },
            },
            required: ["totalTrades", "winRateBps", "tier"],
            type: "object"
        }
    }
};
// ── Payment middleware factory ─────────────────────────────
function requirePayment(amount, description, endpoint) {
    return async (req, res, next) => {
        const xPayment = req.headers["x-payment"];
        if (!xPayment) {
            return res.status(402).json({
                error: "X-PAYMENT header is required",
                accepts: [{
                        scheme: "gokite-aa",
                        network: "kite-testnet",
                        maxAmountRequired: amount,
                        resource: `${API_BASE_URL}${endpoint}`,
                        description,
                        mimeType: "application/json",
                        outputSchema: OUTPUT_SCHEMAS[endpoint] ?? null,
                        payTo: PAYEE_ADDRESS,
                        maxTimeoutSeconds: 300,
                        asset: PAYMENT_ASSET,
                        extra: null,
                        merchantName: "Dragent",
                    }],
                x402Version: 1,
            });
        }
        // Testnet — skip verification
        if (process.env.NODE_ENV !== "production") {
            console.log("⚠️  Testnet: X-Payment present, skipping verification");
            return next();
        }
        // Production — verify + settle via Pieverse
        try {
            const payload = JSON.parse(Buffer.from(xPayment, "base64").toString("utf8"));
            // Step 1: Verify
            const verifyRes = await axios_1.default.post(`${PIEVERSE_FACILITATOR}/v2/verify`, { authorization: payload, network: "kite-testnet" }, { timeout: 5000 });
            if (!verifyRes.data?.valid) {
                return res.status(402).json({ error: "Payment verification failed" });
            }
            // Step 2: Settle
            await axios_1.default.post(`${PIEVERSE_FACILITATOR}/v2/settle`, {
                authorization: payload,
                signature: payload.signature,
                network: "kite-testnet"
            }, { timeout: 10000 });
            console.log(`💰 Payment settled via Pieverse for ${endpoint}`);
            next();
        }
        catch (err) {
            console.error("Payment error:", err);
            return res.status(402).json({ error: "Payment failed" });
        }
    };
}
