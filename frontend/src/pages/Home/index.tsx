import LandingHero from "./LandingHero";
import HowItWorksSection from "./HowItWorksSection"
import RecentListingsCarousel from "./RecentListingsCarousel";
import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Fractional Art Investing | GovTrackAI"
        description="Discover, learn about, and invest in blue-chip art—one fraction at a time."
      />

      <div className="space-y-16 sm:space-y-24">
        <LandingHero />
        <HowItWorksSection />
        <RecentListingsCarousel />
      </div>
    </>
  );
}
