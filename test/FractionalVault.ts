import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ZeroAddress } from "ethers";

describe("FractionalVault and VaultFactory", function () {
  async function deployFixture() {
    const [creator, other] = await hre.ethers.getSigners();

    const BluemaroonNFT = await hre.ethers.getContractFactory("BluemaroonNFT");
    const nft = await BluemaroonNFT.deploy();

    const FractionalVault = await hre.ethers.getContractFactory("FractionalVault");
    const implementation = await FractionalVault.deploy();

    const VaultFactory = await hre.ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy(await implementation.getAddress());

    await nft.connect(creator).mint("ipfs://creator-token");
    await nft.connect(other).mint("ipfs://other-token");

    return { creator, other, nft, implementation, factory, FractionalVault };
  }

  it("initializes once, moves NFT custody, and mints shares", async function () {
    const { creator, nft, implementation } = await loadFixture(deployFixture);
    const vaultAddress = await implementation.getAddress();

    await nft.connect(creator).approve(vaultAddress, 1n);

    await expect(
      implementation
        .connect(creator)
        .initialize(creator.address, await nft.getAddress(), 1n, 100n, "Blue Shares", "BMS"),
    )
      .to.emit(nft, "Transfer")
      .withArgs(creator.address, vaultAddress, 1n)
      .and.to.emit(implementation, "Transfer")
      .withArgs(ZeroAddress, creator.address, 100n * 10n ** 18n);

    expect(await implementation.initialized()).to.equal(true);
    expect(await implementation.nft()).to.equal(await nft.getAddress());
    expect(await implementation.tokenId()).to.equal(1n);
    expect(await nft.ownerOf(1n)).to.equal(vaultAddress);
    expect(await implementation.balanceOf(creator.address)).to.equal(100n * 10n ** 18n);
    expect(await implementation.name()).to.equal("Blue Shares");
    expect(await implementation.symbol()).to.equal("BMS");

    await expect(
      implementation
        .connect(creator)
        .initialize(creator.address, await nft.getAddress(), 1n, 100n, "Again", "AGAIN"),
    ).to.be.revertedWith("already init");
  });

  it("predicts the factory vault, emits it, transfers custody, and mints shares", async function () {
    const { creator, nft, factory, FractionalVault } = await loadFixture(deployFixture);
    const nftAddress = await nft.getAddress();
    const predicted = await factory.predictVault(nftAddress, 1n, creator.address);

    await nft.connect(creator).approve(predicted, 1n);

    await expect(
      factory.connect(creator).createVault(nftAddress, 1n, 250n, "Vault Shares", "VSH"),
    )
      .to.emit(factory, "VaultCreated")
      .withArgs(predicted, nftAddress, 1n, 250n, creator.address);

    const vault = FractionalVault.attach(predicted);
    expect(await nft.ownerOf(1n)).to.equal(predicted);
    expect(await vault.balanceOf(creator.address)).to.equal(250n * 10n ** 18n);
    expect(await vault.nft()).to.equal(nftAddress);
    expect(await vault.tokenId()).to.equal(1n);
    expect(await vault.name()).to.equal("Vault Shares");
    expect(await vault.symbol()).to.equal("VSH");
  });

  it("fails when creating the same deterministic vault twice", async function () {
    const { creator, nft, factory } = await loadFixture(deployFixture);
    const nftAddress = await nft.getAddress();
    const predicted = await factory.predictVault(nftAddress, 1n, creator.address);

    await nft.connect(creator).approve(predicted, 1n);
    await factory.connect(creator).createVault(nftAddress, 1n, 100n, "Vault Shares", "VSH");

    await expect(
      factory.connect(creator).createVault(nftAddress, 1n, 100n, "Vault Shares", "VSH"),
    ).to.be.reverted;
  });
});
