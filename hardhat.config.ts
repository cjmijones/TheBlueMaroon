import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-abi-exporter";
import * as dotenv from "dotenv";
dotenv.config();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
}

const networks = {
  sepolia: {
    url: req("RPC_URL_SEPOLIA"),
    accounts: [req("PK_SEPOLIA")],
    chainId: 11155111,
  },
  mainnet: {
    url: process.env.RPC_URL_MAINNET || "",
    accounts: process.env.PK_MAINNET ? [process.env.PK_MAINNET] : [],
    chainId: 1,
  },
  polygon: {
    url: process.env.RPC_URL_POLYGON || "",
    accounts: process.env.PK_POLYGON ? [process.env.PK_POLYGON] : [],
    chainId: 137,
  },
  base: {
    url: process.env.RPC_URL_BASE || "",
    accounts: process.env.PK_BASE ? [process.env.PK_BASE] : [],
    chainId: 8453,
  },
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.8.28" }, { version: "0.8.20" }],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  abiExporter: [
    /* ---------- front-end ---------- */
    {
      path: "./frontend/src/abi",
      flat: true,
      clear: true,
      runOnCompile: true,
      only: ["BluemaroonNFT", "VaultFactory", "FractionalVault"],
    },
    /* ---------- back-end ---------- */
    {
      path: "./backend/app/abi",      // <── new folder inside FastAPI code
      flat: true,
      clear: true,
      runOnCompile: true,
      only: ["BluemaroonNFT", "VaultFactory", "FractionalVault"],
    },
  ],
  networks,
};

export default config;
