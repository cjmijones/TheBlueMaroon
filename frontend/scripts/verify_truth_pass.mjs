import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(scriptDir, "..");

const filesToScan = [
  "src/hooks/usePositions.tsx",
  "src/hooks/usePosition.tsx",
  "src/hooks/useWithdrawable.tsx",
  "src/hooks/useOpenOrders.tsx",
  "src/hooks/useOrderBook.tsx",
  "src/hooks/useSellQuote.tsx",
  "src/hooks/useListings.tsx",
  "src/hooks/useRecentListings.tsx",
  "src/hooks/useAsset.tsx",
  "src/pages/HoldingDetail/index.tsx",
  "src/pages/Explore/index.tsx",
  "src/pages/AssetDetail/index.tsx",
  "src/pages/Home/RecentListingsCarousel.tsx",
  "src/components/CheckoutModal/index.tsx",
  "src/components/SellModal/index.tsx",
  "src/components/WithdrawModal/index.tsx",
  "src/components/OrderMarket/MarketDepthCard.tsx",
  "src/components/OrderMarket/OpenOrdersTable.tsx",
];

const forbiddenPatterns = [
  /Claude Monet|Warhol|Kusama|Haystacks|Campbell/i,
  /MOCK[A-Z_]*|Mock Artwork/i,
  /eth:\s*0\.1234|usd:\s*390/,
  /qty:\s*5|price:\s*"0\.11"|status:\s*"Pending"/,
  /qty\s*\*\s*0\.01|qty\s*\*\s*32/,
  /price_per_share:\s*135|shares_sold:\s*8470/,
  /Estimated proceeds|Confirm \(stub\)|Withdraw \(stub\)/i,
];

const requiredSnippets = new Map([
  ["src/hooks/useListings.tsx", ["items: []", "unavailableReason"]],
  ["src/hooks/useRecentListings.tsx", ["queryFn: async () => []"]],
  ["src/hooks/useAsset.tsx", ["asset: null", "reason:"]],
  ["src/hooks/useWithdrawable.tsx", ["eth: null", "isAvailable: false"]],
  ["src/hooks/useSellQuote.tsx", ["eth: null", "isAvailable: false"]],
  ["src/hooks/useOrderBook.tsx", ["bids: []", "asks: []", "isAvailable: false"]],
  ["src/hooks/useOpenOrders.tsx", ["orders: []", "isAvailable: false"]],
  ["src/pages/HoldingDetail/index.tsx", ["Trading unavailable", "Withdrawals unavailable", "usePosition"]],
  ["src/pages/Explore/index.tsx", ["Marketplace listings unavailable"]],
  ["src/pages/AssetDetail/index.tsx", ["Marketplace asset unavailable"]],
  ["src/components/CheckoutModal/index.tsx", ["Checkout unavailable"]],
]);

const failures = [];

for (const file of filesToScan) {
  const absolutePath = join(frontendDir, file);
  if (!existsSync(absolutePath)) {
    failures.push(`${file}: missing`);
    continue;
  }

  const content = readFileSync(absolutePath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${file}: forbidden truth-pass regression matched ${pattern}`);
    }
  }
}

for (const [file, snippets] of requiredSnippets) {
  const absolutePath = join(frontendDir, file);
  const content = existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      failures.push(`${file}: missing required snippet "${snippet}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("truth-pass verifier: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`truth-pass verifier: PASS - ${filesToScan.length} files checked`);
