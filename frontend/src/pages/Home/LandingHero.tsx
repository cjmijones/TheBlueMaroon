
import Button from "../../components/ui/button/Button";
import { ArrowRightIcon } from "../../icons";     // use any Lucide icon alias you already have
import { Link } from "react-router-dom";

export default function LandingHero() {
  return (
    <section
      className="
        relative isolate overflow-hidden
        rounded-2xl border border-gray-200 bg-white p-8 shadow-sm
        dark:border-gray-800 dark:bg-white/[0.03]
      "
    >
      {/* subtle on-brand tint (very faint) */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(ellipse_at_center,theme(colors.brand.50/30%)_0%,transparent_70%)]
          dark:bg-[radial-gradient(ellipse_at_center,theme(colors.brand.500/8%)_0%,transparent_70%)]
        "
      />

      <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="text-4xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-6xl">
          Invest in world-class art
          <br className="hidden sm:inline" />
          <span className="sm:ml-2">one fraction at a time</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-gray-600 dark:text-gray-400 sm:text-xl sm:leading-8">
          Own iconic masterpieces, diversify your portfolio, and trade shares
          instantly—all secured by Ethereum.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link to="/explore">
            <Button size="md" className="group">
              Browse Listings
              <ArrowRightIcon className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <a
            href="#how-it-works"
            className="text-base font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}