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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const router = (0, express_1.Router)();
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.KITE_RPC);
const relayer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, provider);
const DUSD_ADDRESS = process.env.DUSD_ADDRESS;
const DUSD_ABI = [
    "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
    "function balanceOf(address) view returns (uint256)",
];
// POST /api/gasless/transfer
// Dragent's own gasless relayer for DUSD
// POST /api/gasless/transfer
router.post("/transfer", async (req, res) => {
    try {
        const { from, to, value, validAfter, validBefore, nonce, v, r, s, } = req.body;
        if (!from || !to || !value || !nonce || !v || !r || !s) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Validate addresses
        if (!ethers_1.ethers.isAddress(from) || !ethers_1.ethers.isAddress(to)) {
            return res.status(400).json({ error: "Invalid address" });
        }
        console.log(`⛽ Relaying gasless DUSD transfer: ${from} → ${to}`);
        console.log(`   Amount: ${ethers_1.ethers.formatUnits(value, 18)} DUSD`);
        const dusd = new ethers_1.ethers.Contract(DUSD_ADDRESS, DUSD_ABI, relayer);
        const tx = await dusd.transferWithAuthorization(from, to, BigInt(value), BigInt(validAfter), BigInt(validBefore), nonce, v, r, s);
        const receipt = await tx.wait();
        console.log(`✅ Gasless transfer relayed: ${receipt.hash}`);
        return res.json({ txHash: receipt.hash });
    }
    catch (err) {
        console.error("Gasless relay error:", err);
        return res.status(500).json({ error: "Relay failed" });
    }
});
// GET /api/gasless/supported-tokens
router.get("/supported-tokens", (_, res) => {
    res.json({
        testnet: [
            {
                address: DUSD_ADDRESS,
                decimals: 18,
                symbol: "DUSD",
                name: "Dragent USD",
                minimum_transfer_amount: "10000000000000000",
            },
        ],
    });
});
exports.default = router;
