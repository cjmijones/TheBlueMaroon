import React from "react";
import { PieChartIcon, LockIcon, DollarLineIcon } from "../../icons";

type Step = {
  icon: React.ReactElement;
  title: string;
  desc: string;
};

const STEPS: Step[] = [
  {
    icon: <PieChartIcon className="size-8" />,
    title: "Buy fractions",
    desc: "Own as little as 1% of a blue-chip painting or sculpture.",
  },
  {
    icon: <LockIcon className="size-8" />,
    title: "Secure custody",
    desc: "Artworks are stored in insured vaults; ownership lives on-chain.",
  },
  {
    icon: <DollarLineIcon className="size-8" />,
    title: "Trade anytime",
    desc: "Liquidate or add to your position instantly in the secondary market.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl space-y-12 px-6 text-center"
    >
      <h2 className="text-3xl font-semibold sm:text-4xl">How It Works</h2>

      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {icon}
            </div>
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
