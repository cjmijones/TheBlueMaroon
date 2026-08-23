import { useMemo } from "react";

import { useUserProfile } from "./userProfile";
import { useWalletControlState } from "./useWalletControlState";

function kycLabel(status?: string) {
  if (status === "clear") return "Verified";
  if (status === "pending") return "Pending review";
  if (status === "reject") return "Review failed";
  if (status === "not_started") return "Not started";
  return "Checking";
}

function kycMessage(status?: string) {
  if (status === "clear") return "KYC is verified for creator actions.";
  if (status === "pending") return "KYC is pending review before creator actions can continue.";
  if (status === "reject") return "KYC must be resolved before creator actions can continue.";
  if (status === "not_started") return "Start KYC before minting or fractionalizing assets.";
  return "Loading account verification status.";
}

export function useCreatorReadiness() {
  const profile = useUserProfile();
  const walletState = useWalletControlState();

  return useMemo(() => {
    const hasProfile = Boolean(profile);
    const hasCreatorRole = Boolean(profile?.roles.includes("creator"));
    const kycStatus = profile?.verification.kyc_status ?? "unknown";
    const kycIsClear = kycStatus === "clear";
    const walletReady = walletState.status === "linked_ready";
    const canCreateAsset = Boolean(profile?.capabilities.can_create_asset);
    const canFractionalize = Boolean(profile?.capabilities.can_fractionalize);
    const canUseCreatorActions =
      hasProfile &&
      walletReady &&
      hasCreatorRole &&
      kycIsClear &&
      canCreateAsset &&
      canFractionalize;

    const blockers: string[] = [];
    if (!hasProfile) blockers.push("Account readiness is still loading.");
    if (!walletReady) blockers.push(walletState.message);
    if (hasProfile && !hasCreatorRole) blockers.push("Creator role is required.");
    if (hasProfile && !kycIsClear) blockers.push(kycMessage(kycStatus));

    return {
      profile,
      walletState,
      hasCreatorRole,
      kycStatus,
      kycLabel: kycLabel(kycStatus),
      kycMessage: kycMessage(kycStatus),
      kycIsClear,
      walletReady,
      canCreateAsset,
      canFractionalize,
      canUseCreatorActions,
      blockers,
      title: canUseCreatorActions ? "Creator actions ready" : "Creator actions blocked",
      message: canUseCreatorActions
        ? "This account, wallet, and KYC status are ready for minting and fractionalization."
        : blockers[0] ?? "Complete the remaining creator action requirements.",
    };
  }, [profile, walletState]);
}

