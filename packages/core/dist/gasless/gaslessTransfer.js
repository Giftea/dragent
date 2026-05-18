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
exports.gaslessTransfer = gaslessTransfer;
exports.getPYUSDBalance = getPYUSDBalance;
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const GASLESS_API = process.env.DRAGENT_GASLESS_API || "http://localhost:3001/api/gasless";
const PYUSD_ADDRESS = process.env.DUSD_ADDRESS || "0x71390906e2FB696520F4eA4b14F5E818d11b36Dc";
const PYUSD_DECIMALS = 18;
// EIP-3009 ABI — only what we need
const EIP3009_ABI = [
    "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
    "function nonces(address owner) view returns (uint256)",
    "function name() view returns (string)",
    "function version() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
];
// ── Generate EIP-3009 signature ───────────────────────────
async function signTransferAuthorization(wallet, to, value, validAfter, validBefore, nonce, chainId) {
    const domain = {
        name: "DUSD",
        version: "1",
        chainId,
        verifyingContract: PYUSD_ADDRESS,
    };
    const types = {
        TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    };
    const message = {
        from: wallet.address,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
    };
    const sig = await wallet.signTypedData(domain, types, message);
    const { v, r, s } = ethers_1.ethers.Signature.from(sig);
    return { v, r, s };
}
// ── Submit gasless transfer ───────────────────────────────
async function gaslessTransfer(wallet, to, amount, // in PYUSD (human readable)
network = "testnet") {
    const provider = wallet.provider;
    const chainId = Number((await provider.getNetwork()).chainId);
    const value = ethers_1.ethers.parseUnits(amount.toString(), PYUSD_DECIMALS);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const validAfter = now - 60n; // valid from 60 seconds ago
    const validBefore = now + 30n; // valid for 30 seconds from now
    const nonce = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
    // Check balance first
    const pyusd = new ethers_1.ethers.Contract(PYUSD_ADDRESS, EIP3009_ABI, provider);
    const balance = await pyusd.balanceOf(wallet.address);
    if (balance < value) {
        throw new Error(`Insufficient PYUSD balance. Have: ${ethers_1.ethers.formatUnits(balance, PYUSD_DECIMALS)}, need: ${amount}`);
    }
    // Sign the transfer authorization
    const { v, r, s } = await signTransferAuthorization(wallet, to, value, validAfter, validBefore, nonce, chainId);
    // Submit to Kite gasless API
    const payload = {
        from: wallet.address,
        to,
        value: value.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        tokenAddress: PYUSD_ADDRESS,
        nonce,
        v,
        r,
        s,
    };
    console.log(`⛽ Submitting gasless transfer: ${amount} PYUSD → ${to}`);
    const res = await axios_1.default.post(`${GASLESS_API}/${network}`, payload, {
        headers: { "Content-Type": "application/json" },
    });
    const txHash = res.data.txHash;
    console.log(`✅ Gasless transfer submitted: ${txHash}`);
    console.log(`🔍 https://testnet.kitescan.ai/tx/${txHash}`);
    return { txHash, success: true };
}
// ── Check PYUSD balance ───────────────────────────────────
async function getPYUSDBalance(address, provider) {
    const pyusd = new ethers_1.ethers.Contract(PYUSD_ADDRESS, EIP3009_ABI, provider);
    const balance = await pyusd.balanceOf(address);
    return ethers_1.ethers.formatUnits(balance, PYUSD_DECIMALS);
}
