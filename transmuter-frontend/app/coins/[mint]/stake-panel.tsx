import { StakeActions } from "@/app/coins/[mint]/stake-actions";
import { stakingAvailable } from "@/lib/catalog/stake";
import type { CoinDetail } from "@/lib/catalog/types";

export function StakePanel({ coin }: { coin: CoinDetail }) {
  if (!stakingAvailable(coin.status) || !coin.stake) return null;

  return (
    <section className="catalog-section">
      <h2>Stake / Unstake</h2>
      <p>
        Stake and unstake are free both ways. Unstake returns only to this wallet. Gross-up is a no-op while the fee is
        0. Voting weight is the snapshot frozen at vote open; the denominator is votable circulating supply, never
        staked supply.
      </p>
      <div className="catalog-stats">
        <article>
          <span>Fee</span>
          <strong>{coin.stake.feeBps} bps</strong>
        </article>
        <article>
          <span>Stake path</span>
          <strong>{coin.stake.liquidated ? "Off" : "Open"}</strong>
        </article>
        <article>
          <span>Unstake</span>
          <strong>Open</strong>
        </article>
        <article>
          <span>Gross-up</span>
          <strong>{coin.stake.feeBps === 0 ? "No-op" : "On"}</strong>
        </article>
      </div>
      <p className="catalog-muted">
        {coin.stake.liquidated
          ? "After liquidation, stake is off and unstake stays on."
          : "Casting a vote sets voter-lock. Latest expiry wins."}
      </p>
      <StakeActions mint={coin.mint} status={coin.status} />
    </section>
  );
}
