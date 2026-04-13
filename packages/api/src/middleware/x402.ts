import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const FACILITATOR_URL = "https://x402.gokite.ai";
const PAYEE_ADDRESS =
  process.env.DRAGENT_PAYEE_ADDRESS || process.env.PRIVATE_KEY
    ? new ethers.Wallet(process.env.PRIVATE_KEY!).address
    : "";

// ── Payment requirements per endpoint ────────────────────
export const PAYMENT_CONFIG: Record<
  string,
  {
    amount: string;
    description: string;
  }
> = {
  "/api/strategy/parse": {
    amount: "100000",
    description: "Strategy parsing — 0.10 PYUSD",
  },
  "/api/reason/generate": {
    amount: "50000",
    description: "Reason generation — 0.05 PYUSD",
  },
  "/api/reputation/lookup": {
    amount: "10000",
    description: "Reputation lookup — 0.01 PYUSD",
  },
};

// ── x402 payment middleware ───────────────────────────────
export function requirePayment(amount: string, description: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const xPayment = req.headers["x-payment"] as string | undefined;

    if (!xPayment) {
      return res.status(402).json({
        error: "Payment required",
        payee_addr: PAYEE_ADDRESS,
        amount,
        token_type: "PYUSD",
        description,
        facilitator: FACILITATOR_URL,
        instructions: {
          step1:
            "Call get_payer_addr via Kite MCP to get your AA wallet address",
          step2: "Call approve_payment via Kite MCP with the above parameters",
          step3:
            "Retry this request with the X-Payment header set to the returned authorization",
        },
      });
    }

    // On testnet — skip verification, just check header exists
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "⚠️  Testnet: X-Payment header present, skipping verification",
      );
      return next();
    }

    // On production — verify with facilitator
    try {
      const verified = await verifyPayment(xPayment, amount, PAYEE_ADDRESS);
      if (!verified) {
        return res.status(402).json({ error: "Payment verification failed" });
      }
      next();
    } catch (err) {
      console.error("Payment verification error:", err);
      return res.status(402).json({ error: "Payment verification failed" });
    }
  };
}

// ── Verify payment via facilitator ───────────────────────
async function verifyPayment(
  xPayment: string,
  expectedAmount: string,
  payeeAddress: string,
): Promise<boolean> {
  try {
    const axios = await import("axios");
    const payload = JSON.parse(
      Buffer.from(xPayment, "base64").toString("utf8"),
    );

    const res = await axios.default.post(
      `${FACILITATOR_URL}/verify`,
      {
        payment: payload,
        expectedAmount,
        payeeAddress,
      },
      { timeout: 5000 },
    );

    return res.data?.valid === true;
  } catch {
    return false;
  }
}

// ── Helper: extract payment info from 402 response ───────
export function parse402Response(responseData: {
  payee_addr: string;
  amount: string;
  token_type: string;
}) {
  return {
    payeeAddr: responseData.payee_addr,
    amount: responseData.amount,
    tokenType: responseData.token_type,
  };
}
