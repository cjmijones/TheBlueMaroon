import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ZeroAddress } from "ethers";

describe("BluemaroonNFT", function () {
  async function deployNftFixture() {
    const [owner, creator, collector] = await hre.ethers.getSigners();
    const BluemaroonNFT = await hre.ethers.getContractFactory("BluemaroonNFT");
    const nft = await BluemaroonNFT.deploy();

    return { nft, owner, creator, collector };
  }

  it("sets the expected collection name and symbol", async function () {
    const { nft } = await loadFixture(deployNftFixture);

    expect(await nft.name()).to.equal("BlueMaroonNFT");
    expect(await nft.symbol()).to.equal("BMN");
  });

  it("mints token id 1 to the caller and stores the token URI", async function () {
    const { nft, creator } = await loadFixture(deployNftFixture);
    const tokenUri = "https://example.test/media/nfts/one.json";

    expect(await nft.connect(creator).mint.staticCall(tokenUri)).to.equal(1n);

    await expect(nft.connect(creator).mint(tokenUri))
      .to.emit(nft, "Transfer")
      .withArgs(ZeroAddress, creator.address, 1n);

    expect(await nft.ownerOf(1n)).to.equal(creator.address);
    expect(await nft.tokenURI(1n)).to.equal(tokenUri);
  });

  it("increments token ids across multiple creators", async function () {
    const { nft, creator, collector } = await loadFixture(deployNftFixture);

    await nft.connect(creator).mint("ipfs://creator-token");
    await nft.connect(collector).mint("ipfs://collector-token");

    expect(await nft.ownerOf(1n)).to.equal(creator.address);
    expect(await nft.ownerOf(2n)).to.equal(collector.address);
    expect(await nft.tokenURI(2n)).to.equal("ipfs://collector-token");
  });
});
