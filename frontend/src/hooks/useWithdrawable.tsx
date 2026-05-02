// src/hooks/useWithdrawable.ts
import { useQuery } from "@tanstack/react-query";
export function useWithdrawable() {
  return useQuery({
    queryKey: ["withdrawable"],
    queryFn: () => new Promise<{ eth: number; usd: number }>(res=> setTimeout(()=> res({ eth: 0.1234, usd: 390 }), 500)),
  });
}