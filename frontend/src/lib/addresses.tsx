/* src/lib/addresses.ts */
export const CHAINS = {
    11155111: {
      name:      "sepolia",
      nft:       import.meta.env.VITE_NFT_SEPOLIA     as `0x${string}`,
      factory:   import.meta.env.VITE_FACTORY_SEPOLIA as `0x${string}`,
      vaultImpl: import.meta.env.VITE_VAULT_IMPL_SEPOLIA as `0x${string}`,
    },
    1: {
      name:      "mainnet",
      nft:       import.meta.env.VITE_NFT_MAINNET     as `0x${string}`,
      factory:   import.meta.env.VITE_FACTORY_MAINNET as `0x${string}`,
      vaultImpl: import.meta.env.VITE_VAULT_IMPL_MAINNET as `0x${string}`,
    },
  } as const;
  