// src/hooks/useOpenOrders.ts
import { useQuery } from "@tanstack/react-query";
export interface Order { id: string; qty: number; price: string; status: string; }
export function useOpenOrders(assetId: string) {
  return useQuery<Order[]>({
    queryKey: ["openOrders", assetId],
    queryFn: ()=> new Promise(res=> setTimeout(()=> res([
      { id:"1", qty:5, price:"0.11", status:"Pending" },
      { id:"2", qty:3, price:"0.12", status:"Partial" },
    ]),500)),
  });
}