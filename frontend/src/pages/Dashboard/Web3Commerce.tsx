import PageMeta from "../../components/common/PageMeta";
import WalletBalanceCard from "../../components/web3Dash/WalletBalanceCard";
import UserAssetsCard from "../../components/web3Dash/UserAssetsCard";
import MintNftCard from "../../components/NFTS/MintNftCard";
import FractionalizeCard from "../../components/NFTS/FractionalizeCard";
import CreatorReadinessPanel from "../../components/web3Dash/CreatorReadinessPanel";
import WalletControlPanel from "../../components/web3Dash/WalletControlPanel";

export default function Web3Dashboard() {
  return (
    <>
      <PageMeta
        title="Blue Maroon | Web3 Dashboard"
        description="Connect wallets, mint NFTs, and fractionalize creator assets."
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <section className="col-span-12 space-y-6 xl:col-span-8">
          <CreatorReadinessPanel />
          <WalletControlPanel />
          <MintNftCard />
          <FractionalizeCard />
        </section>

        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <WalletBalanceCard />
          <UserAssetsCard />
        </aside>
      </div>
    </>
  );
}
