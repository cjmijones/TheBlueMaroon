// ▒▒▒ hooks/useAsset.ts ▒▒▒
import { useQuery } from "@tanstack/react-query";

export interface Asset {
  id: string;
  title: string;
  images: string[];
  price_per_share: number;
  total_shares: number;
  shares_sold: number;
  description: string;
  documents: { name: string; url: string }[];
  recentActivity: { tx: string; date: string; amount: number }[];
}

const MOCK_ASSET: Asset = {
  id: "monet-haystacks",
  title: "Claude Monet • Haystacks, 1890",
  images: ["/images/mock/monet.jpg"],
  price_per_share: 135,
  total_shares: 10000,
  shares_sold: 8470,
  description:
    "An iconic Impressionist masterpiece, stored in climate‑controlled vaults.",
  documents: [
    { name: "Appraisal Report", url: "/docs/appraisal.pdf" },
    { name: "Insurance Certificate", url: "/docs/insurance.pdf" },
  ],
  recentActivity: [
    { tx: "Buy", date: "2025-07-05", amount: 1500 },
    { tx: "Buy", date: "2025-07-04", amount: 750 },
  ],
};

export function useAsset(id: string) {
  return useQuery<Asset>({
    queryKey: ["asset", id],
    queryFn: () =>
      new Promise((res) => setTimeout(() => res(MOCK_ASSET), 400)),
  });
}