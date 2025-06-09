import PageMeta from "../../components/common/PageMeta";
import WalletBalanceCard from "../../components/web3Dash/WalletBalanceCard";
import ActiveListingsGrid from "../../components/web3Dash/ActiveListingsGrid";
import OrdersStatusCard from "../../components/web3Dash/OrdersStatusCard";
import IdentityStatusCard from "../../components/web3Dash/IdentityStatusCard";
import MintNftCard from "../../components/NFTS/MintNftCard";
import FractionalizeCard from "../../components/NFTS/FractionalizeCard";

export default function Web3Dashboard() {
  return (
    <>
      <PageMeta
        title="Blue Maroon | Web3 Dashboard"
        description="Mint NFTs, fractionalize them, and trade shares on-chain."
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* ───────────────────────────── Col A ───────────────────────────── */}
        <section className="col-span-12 space-y-6 xl:col-span-8">
          <WalletBalanceCard />
          <MintNftCard />
          <FractionalizeCard />
          <ActiveListingsGrid />
        </section>

        {/* ───────────────────────────── Col B ───────────────────────────── */}
        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <OrdersStatusCard />
          <IdentityStatusCard />
        </aside>
      </div>
    </>
  );
}
