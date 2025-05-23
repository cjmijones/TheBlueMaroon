// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const Coll = await ethers.deployContract("FractionalCollection");
  await Coll.waitForDeployment();
  console.log("✅ Contract deployed to:", await Coll.getAddress());
}
main();
