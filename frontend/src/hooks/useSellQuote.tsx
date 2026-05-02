// src/hooks/useSellQuote.ts
import { useQuery } from "@tanstack/react-query";
export function useSellQuote(assetId: string, qty: number) {
  return useQuery({
    queryKey: ["sellQuote", assetId, qty],
    queryFn: () => new Promise<{ eth: number; usd: number }>(res=> setTimeout(()=> res({ eth: qty * 0.01, usd: qty*32 }), 500)),
  });
}