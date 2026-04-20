import { Router } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const router = Router();
const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
const relayer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const DUSD_ADDRESS = process.env.DUSD_ADDRESS!;

const DUSD_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function balanceOf(address) view returns (uint256)",
];

// POST /api/gasless/transfer
// Dragent's own gasless relayer for DUSD
// POST /api/gasless/transfer
router.post("/transfer", async (req, res) => {
  try {
    const {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      v, r, s,
    } = req.body;

    if (!from || !to || !value || !nonce || !v || !r || !s) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate addresses
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    console.log(`⛽ Relaying gasless DUSD transfer: ${from} → ${to}`);
    console.log(`   Amount: ${ethers.formatUnits(value, 18)} DUSD`);

    const dusd = new ethers.Contract(DUSD_ADDRESS, DUSD_ABI, relayer);

    const tx = await dusd.transferWithAuthorization(
      from,
      to,
      BigInt(value),
      BigInt(validAfter),
      BigInt(validBefore),
      nonce,
      v, r, s
    );

    const receipt = await tx.wait();
    console.log(`✅ Gasless transfer relayed: ${receipt.hash}`);

    return res.json({ txHash: receipt.hash });

  } catch (err) {
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

export default router;
