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
