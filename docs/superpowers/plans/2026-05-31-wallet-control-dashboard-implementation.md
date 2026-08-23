# Wallet Control Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Web3 Dashboard the single home for wallet connection/linking and non-marketplace blockchain actions, while making Profile account-only and Portfolio read-mostly.

**Architecture:** Fix the SIWE nonce bug at the backend boundary, then add a small frontend wallet-control state hook used by Web3 Dashboard, Portfolio, and creator action cards. The UI will centralize wallet actions in `/web3-commerce`, route Portfolio wallet actions there, and gate mint/fractionalization on a wallet that is both connected and linked to the authenticated Supabase account.

**Tech Stack:** FastAPI, Redis, python-siwe, pytest, React 19, Vite, TypeScript, wagmi, RainbowKit, viem, TanStack Query, Tailwind.

**User Constraint:** Do not run or include git commands for this work.

---

## Scope

This plan implements `docs/superpowers/specs/2026-05-31-wallet-control-dashboard-design.md`.

The plan intentionally avoids marketplace order flows, fiat onramp, trading, final metrics, and a global header wallet widget.

---

## File Map

Backend:

- Modify `backend/app/api/routes_wallets.py`: replace URL-safe nonce generation with SIWE-safe alphanumeric nonce generation.
- Modify `backend/tests/test_wallet_routes.py`: add focused tests for nonce safety and nonce issue behavior.

Frontend:

- Create `frontend/src/hooks/useWalletControlState.tsx`: shared derived wallet state for connected, linked, wrong-chain, and recovery messaging.
- Create `frontend/src/hooks/useLinkWallet.tsx`: wallet-link workflow with checksum address normalization and user-friendly error mapping.
- Modify `frontend/src/components/wallet/LinkWalletButton.tsx`: make it a presentation button around `useLinkWallet`.
- Create `frontend/src/components/web3Dash/WalletControlPanel.tsx`: wallet action center for Web3 Dashboard.
- Modify `frontend/src/pages/Dashboard/Web3Commerce.tsx`: add wallet panel and remove empty marketplace/dashboard placeholders.
- Modify `frontend/src/pages/PortfolioDashboard/index.tsx`: remove direct connect/link actions and route wallet management to `/web3-commerce`.
- Modify `frontend/src/components/UserProfiles.tsx`: remove wallet management from Profile.
- Modify `frontend/src/hooks/useMintNft.tsx`: gate minting on `linked_ready`.
- Modify `frontend/src/components/NFTS/MintNftCard.tsx`: show wallet readiness copy when disabled.
- Modify `frontend/src/hooks/useFractionalize.tsx`: gate fractionalization on `linked_ready`.
- Modify `frontend/src/components/NFTS/FractionalizeCard.tsx`: show wallet readiness copy when disabled.
- Optionally remove unused `frontend/src/components/UserProfile/WalletCard.tsx` if no imports remain.

Verification:

- Run targeted backend pytest for wallet routes.
- Run frontend build.
- Run frontend lint if build passes.
- Manually verify the key wallet states in the browser when a local server is available.

---

## Task 1: Fix SIWE Nonce Generation

**Files:**

- Modify: `backend/app/api/routes_wallets.py`
- Modify: `backend/tests/test_wallet_routes.py`

- [ ] **Step 1: Add failing nonce tests**

Append these tests to `backend/tests/test_wallet_routes.py`:

```python
import re


def test_generate_siwe_nonce_is_alphanumeric_and_fixed_length():
    for _ in range(100):
        nonce = routes_wallets._generate_siwe_nonce()
        assert re.fullmatch(r"[A-Za-z0-9]{24}", nonce)


def test_issue_nonce_uses_siwe_safe_nonce(monkeypatch):
    class FakeRedis:
        def __init__(self):
            self.value = None

        async def set(self, key, value, ex=None, nx=False):
            self.value = value
            return True

    monkeypatch.setattr(routes_wallets, "_generate_siwe_nonce", lambda: "AbCdEf1234567890GhIjKlMn")

    user = type("User", (), {"id": "user-123"})()
    result = asyncio.run(routes_wallets.issue_nonce(user=user, redis=FakeRedis()))

    assert result == {"nonce": "AbCdEf1234567890GhIjKlMn"}
```

- [ ] **Step 2: Run the focused backend test and confirm the new tests fail**

Run:

```powershell
cd backend
.\venv\Scripts\python -m pytest tests/test_wallet_routes.py -q --tb=short --disable-warnings
```

Expected before implementation: failure because `routes_wallets._generate_siwe_nonce` does not exist.

- [ ] **Step 3: Implement SIWE-safe nonce generation**

In `backend/app/api/routes_wallets.py`, replace:

```python
from secrets import token_urlsafe
```

with:

```python
import string
from secrets import choice
```

Near `NONCE_TTL`, add:

```python
SIWE_NONCE_ALPHABET = string.ascii_letters + string.digits
SIWE_NONCE_LENGTH = 24
```

Add this helper above `issue_nonce`:

```python
def _generate_siwe_nonce() -> str:
    return "".join(choice(SIWE_NONCE_ALPHABET) for _ in range(SIWE_NONCE_LENGTH))
```

Inside `issue_nonce`, replace:

```python
nonce = token_urlsafe(16)
```

with:

```python
nonce = _generate_siwe_nonce()
```

- [ ] **Step 4: Run the focused backend test and confirm it passes**

Run:

```powershell
cd backend
.\venv\Scripts\python -m pytest tests/test_wallet_routes.py -q --tb=short --disable-warnings
```

Expected after implementation: all tests in `test_wallet_routes.py` pass.

---

## Task 2: Add Shared Wallet Control State

**Files:**

- Create: `frontend/src/hooks/useWalletControlState.tsx`

- [ ] **Step 1: Create the shared state hook**

Create `frontend/src/hooks/useWalletControlState.tsx`:

```tsx
import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useWallets } from "./useWalletAPI";

export type WalletControlStatus =
  | "loading"
  | "not_connected"
  | "wrong_chain"
  | "linked_ready"
  | "connected_not_linked"
  | "connected_different_wallet";

export type WalletControlWallet = {
  address: string;
  chain_id: number;
  ens_name?: string | null;
  is_primary: boolean;
  linked_at: string;
};

export type WalletControlState = {
  status: WalletControlStatus;
  address?: `0x${string}`;
  chainId?: number;
  linkedWallets: WalletControlWallet[];
  matchingWallet?: WalletControlWallet;
  hasLinkedWallets: boolean;
  isSupportedChain: boolean;
  creatorActionsAllowed: boolean;
  title: string;
  message: string;
  actionLabel: string;
};

export const SUPPORTED_WALLET_CHAINS = [11155111, 1] as const;

export function isSameAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function shortAddress(address?: string | null) {
  if (!address) return "Unknown wallet";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function chainLabel(chainId?: number) {
  if (chainId === 11155111) return "Sepolia";
  if (chainId === 1) return "Mainnet";
  if (chainId == null) return "Unknown chain";
  return `Chain ${chainId}`;
}

export function useWalletControlState(): WalletControlState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { list } = useWallets();

  return useMemo(() => {
    const linkedWallets = (list.data ?? []) as WalletControlWallet[];
    const hasLinkedWallets = linkedWallets.length > 0;
    const matchingWallet = linkedWallets.find((wallet) =>
      isSameAddress(wallet.address, address)
    );
    const isSupportedChain =
      typeof chainId === "number" &&
      SUPPORTED_WALLET_CHAINS.includes(chainId as (typeof SUPPORTED_WALLET_CHAINS)[number]);

    if (list.isLoading) {
      return {
        status: "loading",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Checking wallet status",
        message: "Looking up linked wallets for this account.",
        actionLabel: "Checking",
      };
    }

    if (!isConnected || !address) {
      return {
        status: "not_connected",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Connect a wallet",
        message: "Connect MetaMask or another wallet to manage creator actions.",
        actionLabel: "Connect wallet",
      };
    }

    if (!isSupportedChain) {
      return {
        status: "wrong_chain",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Switch networks",
        message: `${shortAddress(address)} is connected on ${chainLabel(chainId)}. Switch to Sepolia or Mainnet to continue.`,
        actionLabel: "Switch network",
      };
    }

    if (matchingWallet) {
      return {
        status: "linked_ready",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: true,
        title: "Wallet ready",
        message: `${shortAddress(address)} is connected, linked, and ready on ${chainLabel(chainId)}.`,
        actionLabel: "Ready",
      };
    }

    if (hasLinkedWallets) {
      return {
        status: "connected_different_wallet",
        address,
        chainId,
        linkedWallets,
        matchingWallet,
        hasLinkedWallets,
        isSupportedChain,
        creatorActionsAllowed: false,
        title: "Connected wallet is not linked",
        message: `${shortAddress(address)} is connected in your browser, but your account is linked to a different wallet. Switch wallets or link this one.`,
        actionLabel: "Link this wallet",
      };
    }

    return {
      status: "connected_not_linked",
      address,
      chainId,
      linkedWallets,
      matchingWallet,
      hasLinkedWallets,
      isSupportedChain,
      creatorActionsAllowed: false,
      title: "Link this wallet",
      message: `${shortAddress(address)} is connected in your browser, but it is not linked to your Blue Maroon account yet.`,
      actionLabel: "Link wallet",
    };
  }, [address, chainId, isConnected, list.data, list.isLoading]);
}
```

- [ ] **Step 2: Run frontend type/build check**

Run:

```powershell
cd frontend
npm run build
```

Expected: build still passes. If it fails because the new hook is unused but valid, fix the reported TypeScript issue before continuing.

---

## Task 3: Refactor Wallet Linking Into A Reusable Hook

**Files:**

- Create: `frontend/src/hooks/useLinkWallet.tsx`
- Modify: `frontend/src/components/wallet/LinkWalletButton.tsx`

- [ ] **Step 1: Create the link workflow hook**

Create `frontend/src/hooks/useLinkWallet.tsx`:

```tsx
import { useCallback, useRef, useState } from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { useAccount, useChainId, useEnsName, useSignMessage } from "wagmi";
import { Buffer } from "buffer/";
import { api } from "../lib/api";
import { useWallets } from "./useWalletAPI";

if (typeof globalThis.Buffer === "undefined") {
  // @ts-expect-error browser polyfill
  globalThis.Buffer = Buffer;
}

export type LinkWalletStatus = "idle" | "signing" | "posting" | "linked" | "error";

function linkErrorMessage(error: unknown) {
  const value = error as {
    code?: number;
    message?: string;
    response?: { data?: { detail?: string } };
  };
  const text = [
    value?.message,
    value?.response?.data?.detail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (value?.code === 4001 || text.includes("user rejected") || text.includes("rejected")) {
    return "The signature request was rejected. Try linking again when ready.";
  }
  if (text.includes("nonce not found") || text.includes("expired") || text.includes("already used")) {
    return "The link request expired. Try again to create a fresh signature request.";
  }
  if (text.includes("unsupported chain")) {
    return "This network is not supported for wallet linking. Switch to Sepolia or Mainnet.";
  }
  if (text.includes("already linked to another user")) {
    return "This wallet is already linked to another account.";
  }
  if (text.includes("invalid message") || text.includes("siwe")) {
    return "The wallet signature message could not be prepared. Refresh and try again.";
  }
  if (text.includes("network") || text.includes("failed to fetch")) {
    return "The wallet link service could not be reached. Check the backend and try again.";
  }
  return "Wallet link failed. Check your wallet, network, and login state before trying again.";
}

export function useLinkWallet() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { add } = useWallets();
  const nonceRef = useRef<string | null>(null);
  const [status, setStatus] = useState<LinkWalletStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ensQuery = useEnsName({
    address,
    chainId: 1,
    query: { enabled: Boolean(address) && chainId === 1 },
  });

  const linkWallet = useCallback(async () => {
    if (!isConnected || !address) {
      setStatus("error");
      setErrorMessage("Connect a browser wallet before linking it to your account.");
      return;
    }
    if (!chainId) {
      setStatus("error");
      setErrorMessage("Your wallet network could not be detected. Reconnect your wallet and try again.");
      return;
    }
    if (nonceRef.current) return;

    try {
      setStatus("signing");
      setErrorMessage(null);

      const checksumAddress = getAddress(address);
      const { data } = await api.post("/wallets/nonce");
      nonceRef.current = data.nonce as string;

      const siwe = new SiweMessage({
        domain: window.location.hostname,
        address: checksumAddress,
        statement: "Link wallet to TheBlueMaroon",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: nonceRef.current,
        issuedAt: new Date().toISOString(),
      });
      const message = siwe.prepareMessage();
      const signature = await signMessageAsync({ message });

      setStatus("posting");

      await add.mutateAsync({
        address: checksumAddress,
        signature,
        message,
        nonce: nonceRef.current,
        chain_id: chainId,
        ens_name: ensQuery.data ?? null,
      });

      setStatus("linked");
    } catch (error) {
      console.error("Wallet link failed with:", error);
      setStatus("error");
      setErrorMessage(linkErrorMessage(error));
    } finally {
      nonceRef.current = null;
    }
  }, [add, address, chainId, ensQuery.data, isConnected, signMessageAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return {
    linkWallet,
    reset,
    status,
    errorMessage,
    isPending: status === "signing" || status === "posting",
    isLinked: status === "linked",
  };
}
```

- [ ] **Step 2: Refactor `LinkWalletButton`**

Replace `frontend/src/components/wallet/LinkWalletButton.tsx` with:

```tsx
import { useEffect } from "react";
import { useAccount } from "wagmi";
import Button from "../ui/button/Button";
import { useLinkWallet } from "../../hooks/useLinkWallet";

type LinkWalletButtonProps = {
  className?: string;
  onLinked?: () => void;
  onError?: (message: string) => void;
};

export default function LinkWalletButton({
  className,
  onLinked,
  onError,
}: LinkWalletButtonProps) {
  const { isConnected, address } = useAccount();
  const { linkWallet, status, errorMessage, isPending, isLinked } = useLinkWallet();

  useEffect(() => {
    if (isLinked) onLinked?.();
  }, [isLinked, onLinked]);

  useEffect(() => {
    if (errorMessage) onError?.(errorMessage);
  }, [errorMessage, onError]);

  if (!isConnected || !address) return null;

  return (
    <Button
      size="sm"
      onClick={linkWallet}
      disabled={isPending || isLinked}
      className={className}
    >
      {status === "signing"
        ? "Sign message"
        : status === "posting"
          ? "Linking"
          : isLinked
            ? "Wallet linked"
            : "Link wallet"}
    </Button>
  );
}
```

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: TypeScript build passes.

---

## Task 4: Add Web3 Dashboard Wallet Control Panel

**Files:**

- Create: `frontend/src/components/web3Dash/WalletControlPanel.tsx`

- [ ] **Step 1: Create the wallet control panel**

Create `frontend/src/components/web3Dash/WalletControlPanel.tsx`:

```tsx
import { useState } from "react";
import {
  useAccountModal,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import LinkWalletButton from "../wallet/LinkWalletButton";
import { useWallets } from "../../hooks/useWalletAPI";
import {
  chainLabel,
  shortAddress,
  useWalletControlState,
} from "../../hooks/useWalletControlState";

export default function WalletControlPanel() {
  const walletState = useWalletControlState();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();
  const { remove } = useWallets();
  const [linkError, setLinkError] = useState<string | null>(null);

  const showLinkButton =
    walletState.status === "connected_not_linked" ||
    walletState.status === "connected_different_wallet";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-gray-500 dark:text-gray-400">
            Wallet control
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {walletState.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {walletState.message}
          </p>
          {linkError && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {linkError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {walletState.status === "not_connected" && (
            <Button size="sm" onClick={() => openConnectModal?.()}>
              Connect wallet
            </Button>
          )}
          {walletState.status === "wrong_chain" && (
            <Button size="sm" onClick={() => openChainModal?.()}>
              Switch network
            </Button>
          )}
          {showLinkButton && (
            <LinkWalletButton
              onLinked={() => setLinkError(null)}
              onError={setLinkError}
            />
          )}
          {walletState.address && (
            <Button size="sm" variant="outline" onClick={() => openAccountModal?.()}>
              Wallet details
            </Button>
          )}
          {walletState.address && (
            <Button size="sm" variant="outline" onClick={() => disconnect()}>
              Disconnect browser
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            Browser wallet
          </p>
          <p className="mt-2 font-mono text-sm text-gray-700 dark:text-gray-300">
            {walletState.address ? shortAddress(walletState.address) : "Not connected"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {chainLabel(walletState.chainId)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            Creator actions
          </p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {walletState.creatorActionsAllowed
              ? "Minting and fractionalization are enabled for this linked wallet."
              : "Link the connected wallet to this account before minting or fractionalizing."}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
            Linked wallets
          </h3>
          <Badge size="sm" color={walletState.hasLinkedWallets ? "success" : "warning"}>
            {walletState.linkedWallets.length.toString()}
          </Badge>
        </div>

        {walletState.linkedWallets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No wallets are linked to this account yet.
          </p>
        ) : (
          <div className="space-y-3">
            {walletState.linkedWallets.map((wallet) => (
              <div
                key={wallet.address}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm text-gray-800 dark:text-white">
                    {wallet.ens_name || shortAddress(wallet.address)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {chainLabel(wallet.chain_id)}
                    {wallet.is_primary ? " · Primary" : ""}
                    {walletState.matchingWallet?.address === wallet.address ? " · Current" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(wallet.address)}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: TypeScript build passes. If Badge color types differ, adjust the color values to values accepted by `frontend/src/components/ui/badge/Badge.tsx`.

---

## Task 5: Recompose Web3 Dashboard

**Files:**

- Modify: `frontend/src/pages/Dashboard/Web3Commerce.tsx`

- [ ] **Step 1: Update dashboard composition**

Replace `frontend/src/pages/Dashboard/Web3Commerce.tsx` with:

```tsx
import PageMeta from "../../components/common/PageMeta";
import WalletBalanceCard from "../../components/web3Dash/WalletBalanceCard";
import UserAssetsCard from "../../components/web3Dash/UserAssetsCard";
import WalletControlPanel from "../../components/web3Dash/WalletControlPanel";
import MintNftCard from "../../components/NFTS/MintNftCard";
import FractionalizeCard from "../../components/NFTS/FractionalizeCard";

export default function Web3Dashboard() {
  return (
    <>
      <PageMeta
        title="Blue Maroon | Web3 Dashboard"
        description="Connect wallets, mint NFTs, and fractionalize creator assets."
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <section className="col-span-12 space-y-6 xl:col-span-8">
          <WalletControlPanel />
          <MintNftCard />
          <FractionalizeCard />
        </section>

        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <WalletBalanceCard />
          <UserAssetsCard />
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: build passes and no imports remain for empty `ActiveListingsGrid` or `IdentityStatusCard` from this page.

---

## Task 6: Make Profile Account-Only

**Files:**

- Modify: `frontend/src/components/UserProfiles.tsx`
- Optional remove: `frontend/src/components/UserProfile/WalletCard.tsx`

- [ ] **Step 1: Remove wallet management from Profile**

In `frontend/src/components/UserProfiles.tsx`, remove:

```tsx
import WalletCard from "../components/UserProfile/WalletCard";
```

Remove this render line:

```tsx
<WalletCard />
```

Update the `PageMeta` values to be app-specific:

```tsx
<PageMeta
  title="Blue Maroon | Profile"
  description="Manage your Blue Maroon account profile."
/>
```

- [ ] **Step 2: Check for remaining `WalletCard` imports**

Run:

```powershell
rg -n "WalletCard" frontend/src
```

Expected: no references except the file definition itself. If no references remain, remove `frontend/src/components/UserProfile/WalletCard.tsx` with a normal editor deletion or a scoped file edit.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: build passes.

---

## Task 7: Convert Portfolio Wallet Control To Read-Only Summary

**Files:**

- Modify: `frontend/src/pages/PortfolioDashboard/index.tsx`

- [ ] **Step 1: Remove direct wallet action imports**

In `frontend/src/pages/PortfolioDashboard/index.tsx`, remove:

```tsx
import { useConnectModal } from "@rainbow-me/rainbowkit";
import LinkWalletButton from "../../components/wallet/LinkWalletButton";
```

Remove the `openConnectModal` line:

```tsx
const { openConnectModal } = useConnectModal();
```

- [ ] **Step 2: Replace the wallet action header**

In the Wallet Control section header, replace the conditional action block with:

```tsx
<Link to="/web3-commerce">
  <Button size="sm">
    Manage wallets
  </Button>
</Link>
```

Change the section heading and copy to:

```tsx
<h2 className="text-base font-semibold text-gray-900 dark:text-white">
  Wallet Summary
</h2>
<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
  Linked wallets and balances. Manage wallet actions in Web3 Dashboard.
</p>
```

- [ ] **Step 3: Improve wallet status labels**

Replace the current compact status text:

```tsx
{wallet.chain_name}
{wallet.is_connected ? " Connected" : ""}
{wallet.is_primary ? " Primary" : ""}
{!wallet.is_linked ? " Not linked" : ""}
```

with:

```tsx
{[
  wallet.chain_name,
  wallet.is_connected ? "Browser connected" : null,
  wallet.is_primary ? "Primary" : null,
  wallet.is_linked ? "Linked account wallet" : "Stored wallet needs review",
]
  .filter(Boolean)
  .join(" · ")}
```

- [ ] **Step 4: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: build passes and Portfolio no longer opens wallet modals or links wallets directly.

---

## Task 8: Gate NFT Minting On Linked Wallet State

**Files:**

- Modify: `frontend/src/hooks/useMintNft.tsx`
- Modify: `frontend/src/components/NFTS/MintNftCard.tsx`

- [ ] **Step 1: Add wallet control state to `useMintNft`**

In `frontend/src/hooks/useMintNft.tsx`, add:

```tsx
import { useWalletControlState } from "./useWalletControlState";
```

Inside `useMintNft`, after wallet/chain constants, add:

```tsx
const walletControl = useWalletControlState();
```

Replace the readiness error block with:

```tsx
let errorMsg: string | null = null;
if (!walletControl.creatorActionsAllowed) {
  errorMsg = walletControl.message;
} else if (!chainCfg) {
  errorMsg = `Unsupported chain (${targetChainId}). Switch to Sepolia or Mainnet.`;
} else if (!nftAddress) {
  errorMsg = `NFT contract address missing for chain ${targetChainId}.`;
}
```

At the bottom of the returned object, include:

```tsx
walletControl,
```

- [ ] **Step 2: Ensure mutation throws the linked-wallet message**

Keep this guard inside `mutationFn`:

```tsx
if (!isReady) throw new Error(errorMsg!);
```

This now blocks connected-but-unlinked wallets before metadata upload or contract writes.

- [ ] **Step 3: Update Mint card readiness copy**

In `frontend/src/components/NFTS/MintNftCard.tsx`, change:

```tsx
const { mutateAsync, isPending, isReady, errorMsg } = useMintNft();
```

to:

```tsx
const { mutateAsync, isPending, isReady, errorMsg, walletControl } = useMintNft();
```

Replace the warning paragraph with:

```tsx
{!isReady && (
  <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
    {walletControl.status === "linked_ready" ? errorMsg : walletControl.message}
  </p>
)}
```

- [ ] **Step 4: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: build passes and mint form is disabled until the wallet state is `linked_ready`.

---

## Task 9: Gate Fractionalization On Linked Wallet State

**Files:**

- Modify: `frontend/src/hooks/useFractionalize.tsx`
- Modify: `frontend/src/components/NFTS/FractionalizeCard.tsx`

- [ ] **Step 1: Add wallet control to `useFractionalize`**

In `frontend/src/hooks/useFractionalize.tsx`, add:

```tsx
import { useWalletControlState } from "./useWalletControlState";
```

Inside `useFractionalize`, add:

```tsx
const walletControl = useWalletControlState();
```

At the start of `mutationFn`, replace:

```tsx
if (!isConnected) throw new Error("Connect wallet first");
```

with:

```tsx
if (!walletControl.creatorActionsAllowed) {
  throw new Error(walletControl.message);
}
```

Return the mutation with an attached wallet control value by assigning the mutation to a variable:

```tsx
const mutation = useMutation({
  mutationFn: async (p: {
    nft: `0x${string}`;
    tokenId: number;
    shares: number;
    name?: string;
    symbol?: string;
    roundPrice?: number;
  }) => {
    // existing mutation body
  },
});

return {
  ...mutation,
  isReady: walletControl.creatorActionsAllowed,
  walletControl,
};
```

- [ ] **Step 2: Update Fractionalize card disabled state**

In `frontend/src/components/NFTS/FractionalizeCard.tsx`, change:

```tsx
const { mutateAsync, isPending, error } = useFractionalize();
```

to:

```tsx
const { mutateAsync, isPending, error, isReady, walletControl } = useFractionalize();
```

Replace:

```tsx
const disabled = isPending;
```

with:

```tsx
const disabled = isPending || !isReady;
```

Add this readiness message above the existing error message:

```tsx
{!isReady && (
  <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
    {walletControl.message}
  </p>
)}
```

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: build passes and fractionalization form is disabled until the wallet state is `linked_ready`.

---

## Task 10: Optional Backend Ownership Hardening For Creator Wallets

**Files:**

- Inspect: `backend/app/api/routes_nfts.py`
- Inspect: `backend/app/api/routes_fractional.py`
- Inspect: `backend/app/crud/wallet.py`

- [ ] **Step 1: Decide based on current route shape**

If `routes_nfts.py` or `routes_fractional.py` accept a wallet address from the frontend and record it as the actor wallet, add a helper that confirms the wallet belongs to the current user before accepting the request.

Use this helper shape in the relevant backend module or a small shared helper:

```python
from sqlalchemy import select
from app.models import Wallet


async def require_linked_wallet(db: AsyncSession, user_id: str, address: str) -> Wallet:
    result = await db.execute(
        select(Wallet).where(
            Wallet.user_id == user_id,
            Wallet.address == address.lower(),
        )
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=403, detail="Wallet is not linked to this account")
    return wallet
```

- [ ] **Step 2: Add only if the route can be safely updated in this slice**

If the route already has `db`, `user`, and the wallet address in the same request handler, call:

```python
await require_linked_wallet(db, user.id, payload.owner_wallet_address)
```

or the equivalent field name.

If this requires broader schema or payload reshaping, skip the code change and record it in `AGENT_TODO.md` as the next backend security hardening task.

- [ ] **Step 3: Run focused backend tests**

Run:

```powershell
cd backend
.\venv\Scripts\python -m pytest tests/test_wallet_routes.py -q --tb=short --disable-warnings
```

Expected: existing wallet tests still pass. Add focused route tests only if a backend route is changed in this task.

---

## Task 11: Update Local Agent Todo

**Files:**

- Modify: `AGENT_TODO.md`

- [ ] **Step 1: Mark completed local items after implementation**

After the implementation is verified, update the wallet workstream in `AGENT_TODO.md`:

```markdown
- [x] Implemented the Web3 Dashboard wallet-control cleanup in `docs/superpowers/specs/2026-05-31-wallet-control-dashboard-design.md`.
- [x] Fixed SIWE nonce generation so frontend SIWE parsing never receives `-` or `_` nonce characters.
```

Add any deferred backend ownership hardening or primary-wallet decisions under the nearest existing `Next:` section.

- [ ] **Step 2: Keep the local board ignored**

Do not stage or commit `AGENT_TODO.md`. It is intentionally local and gitignored.

---

## Task 12: Focused Verification

**Files:**

- No code files expected.

- [ ] **Step 1: Run backend focused tests**

Run:

```powershell
cd backend
.\venv\Scripts\python -m pytest tests/test_wallet_routes.py -q --tb=short --disable-warnings
```

Expected: pass.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: pass.

- [ ] **Step 3: Run frontend lint**

Run:

```powershell
cd frontend
npm run lint
```

Expected: pass or report only pre-existing unrelated lint findings. If lint reports new findings in changed files, fix them before completing.

- [ ] **Step 4: Manual browser checks**

Use the running app and verify:

- Profile no longer shows connected wallet management.
- Portfolio wallet section is a summary and routes wallet management to `/web3-commerce`.
- Web3 Dashboard shows wallet control when no wallet is connected.
- Web3 Dashboard shows connected-but-unlinked guidance and a link action.
- Linking a wallet no longer produces SIWE parser errors from nonce characters.
- Mint and fractionalization controls are disabled while the connected wallet is unlinked.
- Mint and fractionalization controls are enabled after the connected wallet is linked and on Sepolia or Mainnet.

---

## Self-Review

Spec coverage:

- Profile account-only boundary: Task 6.
- Portfolio read-mostly boundary: Task 7.
- Web3 Dashboard action ownership: Tasks 4 and 5.
- SIWE nonce failure: Task 1.
- Friendly link errors and checksum address: Task 3.
- Creator action gates: Tasks 8 and 9.
- Focused verification: Task 12.

Placeholder scan:

- No unresolved placeholders are intentionally left in this plan.
- The optional backend hardening task is bounded with a concrete skip condition and a concrete follow-up recording step.

Type consistency:

- The wallet state hook exposes `creatorActionsAllowed`, `status`, `message`, `linkedWallets`, and `matchingWallet`.
- Mint and fractionalization tasks consume the same `walletControl` shape.
- `LinkWalletButton` uses the `useLinkWallet` return values defined in Task 3.
