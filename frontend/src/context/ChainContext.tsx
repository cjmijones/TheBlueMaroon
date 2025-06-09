import { createContext, useContext } from "react";

/** Default chain is Sepolia test-net (11155111) */
export const ChainContext = createContext<number>(11155111);

export const useChain = () => useContext(ChainContext);
