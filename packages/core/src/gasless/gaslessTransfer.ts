import { ethers } from "ethers";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const GASLESS_API = process.env.DRAGENT_GASLESS_API || "http://localhost:3001/api/gasless";
const PYUSD_ADDRESS =
  process.env.DUSD_ADDRESS || "0x71390906e2FB696520F4eA4b14F5E818d11b36Dc";
const PYUSD_DECIMALS = 18;

// EIP-3009 ABI — only what we need
const EIP3009_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
];

export interface GaslessTransferResult {
  txHash: string;
  success: boolean;
}

// ── Generate EIP-3009 signature ───────────────────────────
async function signTransferAuthorization(
  wallet: ethers.Wallet,
  to: string,
  value: bigint,
  validAfter: bigint,
  validBefore: bigint,
  nonce: string,
  chainId: number,
): Promise<{ v: number; r: string; s: string }> {
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
  const { v, r, s } = ethers.Signature.from(sig);
  return { v, r, s };
}

// ── Submit gasless transfer ───────────────────────────────
export async function gaslessTransfer(
  wallet: ethers.Wallet,
  to: string,
  amount: number, // in PYUSD (human readable)
  network: "testnet" | "mainnet" = "testnet",
): Promise<GaslessTransferResult> {
  const provider = wallet.provider!;
  const chainId = Number((await provider.getNetwork()).chainId);
  const value = ethers.parseUnits(amount.toString(), PYUSD_DECIMALS);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const validAfter = now - 60n; // valid from 60 seconds ago
  const validBefore = now + 30n; // valid for 30 seconds from now
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  // Check balance first
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, EIP3009_ABI, provider);
  const balance = await pyusd.balanceOf(wallet.address);

  if (balance < value) {
    throw new Error(
      `Insufficient PYUSD balance. Have: ${ethers.formatUnits(
        balance,
        PYUSD_DECIMALS,
      )}, need: ${amount}`,
    );
  }

  // Sign the transfer authorization
  const { v, r, s } = await signTransferAuthorization(
    wallet,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    chainId,
  );

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

  const res = await axios.post(`${GASLESS_API}/${network}`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const txHash = res.data.txHash;
  console.log(`✅ Gasless transfer submitted: ${txHash}`);
  console.log(`🔍 https://testnet.kitescan.ai/tx/${txHash}`);

  return { txHash, success: true };
}

// ── Check PYUSD balance ───────────────────────────────────
export async function getPYUSDBalance(
  address: string,
  provider: ethers.Provider,
): Promise<string> {
  const pyusd = new ethers.Contract(PYUSD_ADDRESS, EIP3009_ABI, provider);
  const balance = await pyusd.balanceOf(address);
  return ethers.formatUnits(balance, PYUSD_DECIMALS);
}
