import { CoinMeta } from "@/app/coins/[mint]/coin-meta";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { formatAmount, formatUsd } from "@/lib/catalog/format";
import type { CoinDetail } from "@/lib/catalog/types";

export function TreasuryPanel({ coin }: { coin: CoinDetail }) {
  const { treasury } = coin;
  const { reserveMint } = treasury;

  return (
    <CoinSection
      title="Treasury transparency"
      lede={`Every backing read counts unconverted USDC. Redemption is quantity-based (${coin.backing} / circulating), not an oracle price.`}
    >
      <CoinStats
        items={[
          { label: `${coin.backing} treasury`, value: formatAmount(treasury.cTokenAmount) },
          { label: "Unconverted USDC", value: formatUsd(treasury.unconvertedUsdc) },
          { label: "Backing value", value: formatUsd(treasury.backingValueUsd) },
          { label: "Redemption", value: formatAmount(treasury.redemptionRatio) },
        ]}
      />
      <CoinMeta
        items={[
          { label: "Path A", value: reserveMint.pathAReady ? "Ready" : "Idle" },
          { label: "Path B", value: reserveMint.pathBActivated ? "Activated" : "Not activated" },
          { label: "Governed mint", value: `${reserveMint.governedPct}% of supply` },
          { label: "Reserve mints this year", value: `${reserveMint.mintsThisYear} / ${reserveMint.yearlyCap}` },
          { label: "Circulating", value: formatAmount(treasury.circulatingSupply) },
          { label: "cToken mark", value: formatUsd(treasury.cTokenPriceUsd) },
        ]}
      />
    </CoinSection>
  );
}
