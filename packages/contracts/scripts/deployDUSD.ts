import { ethers } from "ethers";
import * as fs    from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC!);
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log("Deploying DUSD from:", wallet.address);

  const artifact = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/DUSD.sol/DUSD.json",
      "utf8"
    )
  );

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  // Mint 1,000,000 DUSD to deployer
  const initialSupply = ethers.parseUnits("1000000", 18);

  const contract = await factory.deploy(wallet.address, initialSupply);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ DUSD deployed to:", address);
  console.log("   Supply: 1,000,000 DUSD");
  console.log("   Faucet: anyone can call faucet() for 100 DUSD");
  console.log("🔍 https://testnet.kitescan.ai/address/" + address);
}

main().catch(console.error);