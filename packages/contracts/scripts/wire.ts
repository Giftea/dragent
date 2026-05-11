// scripts/wire.ts
import { ethers } from "ethers";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const abi = JSON.parse(
    fs.readFileSync("./artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json", "utf8")
  ).abi;

  const registry = new ethers.Contract(
    process.env.REPUTATION_REGISTRY_ADDRESS!,
    abi,
    wallet
  );

  const tx = await registry.authorizeCaller(process.env.AGENT_VAULT_ADDRESS!);
  await tx.wait();
  console.log("✅ AgentVault authorized to call ReputationRegistry");

  const tx1b = await registry.authorizeCaller(wallet.address);
  await tx1b.wait();
  console.log("✅ Deployer authorized as caller in ReputationRegistry");

  const abi2 = JSON.parse(
    fs.readFileSync("./artifacts/contracts/TradeJournal.sol/TradeJournal.json", "utf8")
  ).abi;

  const journal = new ethers.Contract(
    process.env.TRADE_JOURNAL_ADDRESS!,
    abi2,
    wallet
  );

  const tx2 = await journal.authorizeAgent(wallet.address);
  await tx2.wait();
  console.log("✅ Deployer wallet authorized as agent in TradeJournal");
}

main().catch(console.error);