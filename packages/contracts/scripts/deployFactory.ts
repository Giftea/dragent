import { ethers } from "ethers";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const rpc      = process.env.KITE_RPC!;
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Deploying from:", wallet.address);
  console.log("Balance:", ethers.formatEther(
    await provider.getBalance(wallet.address)
  ), "KITE");

  const artifact = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/AgentVaultFactory.sol/AgentVaultFactory.json",
      "utf8"
    )
  );

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  const contract = await factory.deploy(
    process.env.SETTLEMENT_TOKEN!,
    process.env.REPUTATION_REGISTRY_ADDRESS!,
    process.env.TRADE_JOURNAL_ADDRESS!
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ AgentVaultFactory deployed to:", address);
  console.log("🔍 Verify at: https://testnet.kitescan.ai/address/" + address);
}

main().catch(console.error);