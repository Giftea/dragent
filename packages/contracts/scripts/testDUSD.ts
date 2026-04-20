import { ethers } from "ethers";
import * as fs from "dotenv";
fs.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const abi = [
    "function balanceOf(address) view returns (uint256)",
    "function faucet()",
    "function decimals() view returns (uint8)",
  ];

  const dusd = new ethers.Contract(
    "0x71390906e2FB696520F4eA4b14F5E818d11b36Dc",
    abi,
    wallet,
  );

  const before = await dusd.balanceOf(wallet.address);
  console.log("Balance before:", ethers.formatUnits(before, 18), "DUSD");

  // Call faucet for AA wallet too
  const aaWallet = "0xC2a30834dB6c50e5477174968a0c94c6b36Aff03";
  const tx1 = await dusd.faucet();
  await tx1.wait();
  console.log("✅ Faucet called for deployer");

  // Transfer some DUSD to AA wallet for gasless testing
  const transferAbi = [
    "function transfer(address to, uint256 amount) returns (bool)",
  ];
  const dusdTransfer = new ethers.Contract(
    "0x71390906e2FB696520F4eA4b14F5E818d11b36Dc",
    transferAbi,
    wallet,
  );

  const tx2 = await dusdTransfer.transfer(
    aaWallet,
    ethers.parseUnits("1000", 18),
  );
  await tx2.wait();
  console.log("✅ Transferred 1000 DUSD to AA wallet:", aaWallet);

  const afterDeployer = await dusd.balanceOf(wallet.address);
  const afterAA = await dusd.balanceOf(aaWallet);

  console.log(
    "Deployer balance:",
    ethers.formatUnits(afterDeployer, 18),
    "DUSD",
  );
  console.log("AA wallet balance:", ethers.formatUnits(afterAA, 18), "DUSD");
}

main().catch(console.error);
