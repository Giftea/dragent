// import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
// import { configVariable, defineConfig } from "hardhat/config";

// export default defineConfig({
//   plugins: [hardhatToolboxViemPlugin],
//   solidity: {
//     profiles: {
//       default: {
//         version: "0.8.28",
//       },
//       production: {
//         version: "0.8.28",
//         settings: {
//           optimizer: {
//             enabled: true,
//             runs: 200,
//           },
//         },
//       },
//     },
//   },
//   networks: {
//     hardhatMainnet: {
//       type: "edr-simulated",
//       chainType: "l1",
//     },
//     hardhatOp: {
//       type: "edr-simulated",
//       chainType: "op",
//     },
//     sepolia: {
//       type: "http",
//       chainType: "l1",
//       url: configVariable("SEPOLIA_RPC_URL"),
//       accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
//     },
//   },
// });

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    kite_testnet: {
      type: "http",
      url: "https://rpc-testnet.gokite.ai",
      chainId: 2368,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    kite_mainnet: {
      type: "http",
      url: "https://rpc.gokite.ai",
      chainId: 2366,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
