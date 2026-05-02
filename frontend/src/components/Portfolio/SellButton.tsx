// src/components/Portfolio/SellButton.tsx
import Button from "../ui/button/Button";
export function SellButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      Sell
    </Button>
  );
}