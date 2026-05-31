export type UserProfile = {
  user_id: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  roles: string[];
  verification: {
    kyc_status: string;
    id_verified_at: string | null;
  };
  wallets: {
    linked_count: number;
    has_linked_wallet: boolean;
  };
  capabilities: {
    can_transact: boolean;
    can_create_asset: boolean;
    can_fractionalize: boolean;
  };
  created_at: string | null;
  last_login: string | null;
};

export interface WalletCreate {
  address: string;
  signature: string;
  message: string;
  nonce: string;
  chain_id: number;
  ens_name?: string | null;
}
