import { ethers } from "hardhat";

async function main() {
  /* 1️⃣  Deploy the ERC-721 collection */
  const NFT = await ethers.deployContract("BluemaroonNFT");
  await NFT.waitForDeployment();
  const nftAddr = await NFT.getAddress();
  console.log("BluemaroonNFT  ➜", nftAddr);

  /* 2️⃣  Deploy the FractionalVault implementation */
  const VaultImpl = await ethers.deployContract("FractionalVault");
  await VaultImpl.waitForDeployment();
  const implAddr = await VaultImpl.getAddress();
  console.log("Vault Impl     ➜", implAddr);

  /* 3️⃣  Deploy the factory with impl address */
  const Factory = await ethers.deployContract("VaultFactory", [implAddr]);
  await Factory.waitForDeployment();
  const factoryAddr = await Factory.getAddress();
  console.log("Vault Factory  ➜", factoryAddr);

  /* 4️⃣  Helpful: predict first vault address for docs/debug */
  const [signer] = await ethers.getSigners();
  const salt = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "address"],
      [nftAddr, 1, await signer.getAddress()]
    )
  );
  const predicted = await Factory.predictVault.staticCall(
    nftAddr,
    1,
    await signer.getAddress()
  );
  console.log("Example vault  ➜", predicted);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
