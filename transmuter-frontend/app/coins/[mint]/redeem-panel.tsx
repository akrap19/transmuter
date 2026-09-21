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
    <section className="catalog-section" id="redeem">
      <h2>Redeem / Claims</h2>
      <p>
        Redemption never closes. Burning EOL pays pro-rata cSOL (after the 35 bps treasury fee) and USDC that counts
        unconverted treasury plus returned runway. A stuck leg does not block the other.
      </p>
      <div className="catalog-stats">
        <article>
          <span>cSOL per token</span>
          <strong>{formatAmount(unit.csolOwed)}</strong>
        </article>
        <article>
          <span>USDC per token</span>
          <strong>{formatUsd(unit.usdcOwed)}</strong>
        </article>
        <article>
          <span>USDC pool</span>
          <strong>{formatUsd(usdcPool)}</strong>
        </article>
        <article>
          <span>Returned escrow</span>
          <strong>{formatUsd(redeem.escrowUsdc)}</strong>
        </article>
      </div>
      <RedeemActions mint={coin.mint} status={coin.status} />
    </section>
  );
}
