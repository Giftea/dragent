import { ethers } from "ethers";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Wiring factory from:", wallet.address);

  // ── Load ABIs ─────────────────────────────────────────────
  const registryAbi = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/ReputationRegistry.sol/ReputationRegistry.json",
      "utf8"
    )
  ).abi;

  const journalAbi = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/TradeJournal.sol/TradeJournal.json",
      "utf8"
    )
  ).abi;

  // ── Contract instances ────────────────────────────────────
  const registry = new ethers.Contract(
    process.env.REPUTATION_REGISTRY_ADDRESS!,
    registryAbi,
    wallet
  );

  const journal = new ethers.Contract(
    process.env.TRADE_JOURNAL_ADDRESS!,
    journalAbi,
    wallet
  );

  const factoryAddress = process.env.AGENT_VAULT_FACTORY_ADDRESS!;

  // ── Authorize factory in ReputationRegistry ───────────────
  console.log("Authorizing factory in ReputationRegistry...");
  const tx1 = await registry.authorizeCaller(factoryAddress);
  await tx1.wait();
  console.log("✅ Factory authorized in ReputationRegistry");

  // ── Authorize factory in TradeJournal ─────────────────────
  console.log("Authorizing factory in TradeJournal...");
  const tx2 = await journal.authorizeAgent(factoryAddress);
  await tx2.wait();
  console.log("✅ Factory authorized in TradeJournal");

  console.log("\n🎉 Factory fully wired. Ready for user onboarding.");
  console.log("   Any user can now call createVault() to deploy their own AgentVault.");
}

main().catch(console.error);