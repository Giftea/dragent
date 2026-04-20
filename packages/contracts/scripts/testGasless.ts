import { ethers } from "ethers";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const DUSD_ADDRESS = "0x71390906e2FB696520F4eA4b14F5E818d11b36Dc";
const GASLESS_API = "http://localhost:3001/api/gasless";
const DUSD_DECIMALS = 18;

const EIP3009_ABI = [
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const chainId = Number((await provider.getNetwork()).chainId);

  console.log("Testing gasless transfer with DUSD");
  console.log("From:", wallet.address);
  console.log("Chain ID:", chainId);

  const dusd = new ethers.Contract(DUSD_ADDRESS, EIP3009_ABI, provider);
  const balanceBefore = await dusd.balanceOf(wallet.address);
  console.log(
    "Balance before:",
    ethers.formatUnits(balanceBefore, DUSD_DECIMALS),
    "DUSD",
  );

  // Transfer 1 DUSD to AA wallet gaslessly
  const to = "0xC2a30834dB6c50e5477174968a0c94c6b36Aff03";
  const value = ethers.parseUnits("1", DUSD_DECIMALS);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const validAfter = now - 60n;
  const validBefore = now + 30n;
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  // Sign EIP-3009 authorization
  const domain = {
    name: "DUSD",
    version: "1",
    chainId,
    verifyingContract: DUSD_ADDRESS,
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

  console.log("\nSigning EIP-3009 authorization...");
  const sig = await wallet.signTypedData(domain, types, message);
  const { v, r, s } = ethers.Signature.from(sig);
  console.log("✅ Signed");

  // Submit to Kite gasless API
  const payload = {
    from: wallet.address,
    to,
    value: value.toString(),
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    tokenAddress: DUSD_ADDRESS,
    nonce,
    v,
    r,
    s,
  };

  console.log("\nSubmitting to gasless API...");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(`${GASLESS_API}/transfer`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("\n✅ Gasless transfer submitted!");
    console.log("TX Hash:", res.data.txHash);
    console.log("🔍 https://testnet.kitescan.ai/tx/" + res.data.txHash);

    // Wait a moment and check balance
    await new Promise((r) => setTimeout(r, 5000));
    const balanceAfter = await dusd.balanceOf(wallet.address);
    console.log(
      "\nBalance after:",
      ethers.formatUnits(balanceAfter, DUSD_DECIMALS),
      "DUSD",
    );
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error(
        "\n❌ Gasless API error:",
        err.response?.data || err.message,
      );
    } else {
      console.error("\n❌ Error:", err);
    }
  }
}

main().catch(console.error);
