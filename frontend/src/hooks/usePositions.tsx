/* --------------------------------------------------------------
   hooks/usePositions.ts  (mock)
-------------------------------------------------------------- */
import { useQuery } from "@tanstack/react-query";

export interface Position {
  id: string;
  title: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  image_url?: string;
}

const MOCK_POSITIONS: Position[] = [
  {
    id: "monet-haystacks",
    title: "Claude Monet • Haystacks, 1890",
    shares: 42,
    avgPrice: 130,
    currentPrice: 135,
    image_url: "/mock/monet.jpg",
  },
  {
    id: "warhol-campbells",
    title: "Andy Warhol • Campbell’s Soup, 1962",
    shares: 80,
    avgPrice: 90,
    currentPrice: 92,
    image_url: "/mock/warhol.jpg",
  },
];

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: () => new Promise((r) => setTimeout(() => r(MOCK_POSITIONS), 400)),
  });
}