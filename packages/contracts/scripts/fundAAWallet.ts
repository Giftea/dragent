import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const aaWallet = "0xC2a30834dB6c50e5477174968a0c94c6b36Aff03";
  const amount   = ethers.parseEther("0.1");

  console.log(`Sending 0.1 KITE to AA wallet ${aaWallet}...`);

  const tx = await wallet.sendTransaction({
    to:    aaWallet,
    value: amount,
  });

  await tx.wait();
  console.log(`✅ Funded! TX: https://testnet.kitescan.ai/tx/${tx.hash}`);

  const balance = await provider.getBalance(aaWallet);
  console.log(`   Balance: ${ethers.formatEther(balance)} KITE`);
}

main().catch(console.error);