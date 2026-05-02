// src/hooks/useOrderBook.ts
import { useQuery } from "@tanstack/react-query";
export interface Depth { price: string; qty: number; }
export function useOrderBook(assetId: string) {
  return useQuery<{ bids: Depth[]; asks: Depth[] }>({
    queryKey: ["orderBook", assetId],
    queryFn: ()=> new Promise(res=> setTimeout(()=> res({
      bids:[{price:"0.095", qty:12},{price:"0.094", qty:20}],
      asks:[{price:"0.105", qty:8},{price:"0.106", qty:15}],
    }),500)),
  });
}