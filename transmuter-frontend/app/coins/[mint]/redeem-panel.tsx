import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { RedeemActions } from "@/app/coins/[mint]/redeem-actions";
import { formatAmount, formatUsd } from "@/lib/catalog/format";
import { quoteRedeem } from "@/lib/catalog/redeem";
import type { CoinDetail } from "@/lib/catalog/types";

export function RedeemPanel({ coin }: { coin: CoinDetail }) {
  if (!coin.redeem) return null;

  const { redeem } = coin;
  const unit = quoteRedeem(redeem, 1);
  const usdcPool = redeem.unconvertedUsdc + redeem.escrowUsdc;

  return (
    <CoinSection
      id="redeem"
      title="Redeem / Claims"
      lede="Redemption never closes. Burning EOL pays pro-rata cSOL (after the 35 bps treasury fee) and USDC that counts unconverted treasury plus returned runway. A stuck leg does not block the other."
    >
      <CoinStats
        items={[
          { label: "cSOL per token", value: formatAmount(unit.csolOwed) },
          { label: "USDC per token", value: formatUsd(unit.usdcOwed) },
          { label: "USDC pool", value: formatUsd(usdcPool) },
          { label: "Returned escrow", value: formatUsd(redeem.escrowUsdc) },
        ]}
      />
      <RedeemActions mint={coin.mint} status={coin.status} />
    </CoinSection>
  );
}
