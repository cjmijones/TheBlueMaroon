import { useQuery } from "@tanstack/react-query";

/* ------------------------------- */
/*  Types                          */
/* ------------------------------- */
export interface Listing {
  id: string;
  title: string;
  price_per_share: number;
  image_url?: string;
}

/* ------------------------------- */
/*  Mock payload (replace later)   */
/* ------------------------------- */
const MOCK_LISTINGS: Listing[] = [
  {
    id: "monet-haystacks",
    title: "Claude Monet • Haystacks, 1890",
    price_per_share: 135,
    image_url: "/images/mock/monet.jpg",
  },
  {
    id: "warhol-campbells",
    title: "Andy Warhol • Campbell’s Soup, 1962",
    price_per_share: 92,
    image_url: "/images/mock/warhol.jpg",
  },
  {
    id: "kusama-pumpkin",
    title: "Yayoi Kusama • Pumpkin, 2014",
    price_per_share: 74,
    image_url: "/images/mock/kusama.jpg",
  },
];

/* ------------------------------- */
/*  Hook                           */
/* ------------------------------- */
export function useRecentListings(limit = 3) {
  return useQuery<Listing[]>({
    queryKey: ["recentListings", limit],
    // ⏱️ imitate latency so the skeleton flashes for ~½ s
    queryFn: () =>
      new Promise<Listing[]>((resolve) =>
        setTimeout(() => resolve(MOCK_LISTINGS.slice(0, limit)), 500)
      ),
  });
}
