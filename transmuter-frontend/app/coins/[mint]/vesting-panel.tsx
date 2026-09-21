import { VestingActions } from "@/app/coins/[mint]/vesting-actions";
import { formatAmount, formatStatus, formatUnix } from "@/lib/catalog/format";
import { CATALOG_NOW } from "@/lib/catalog/mock";
import { scheduleLabel } from "@/lib/catalog/schedule";
import { vestedForEntry } from "@/lib/catalog/vesting";
import type { CoinDetail } from "@/lib/catalog/types";

export function VestingPanel({ coin }: { coin: CoinDetail }) {
  if (!coin.vesting) return null;

  const { vesting } = coin;
  const vested = vestedForEntry(vesting, CATALOG_NOW);
  const remaining = Math.max(0, vesting.totalAllocation - vesting.alreadyClaimed);

  return (
    <section className="catalog-section" id="vesting">
      <h2>Vesting</h2>
      <p>
        Two custody pots, no cross-transfer. Team unvested burns at liquidation and totalAllocation is rewritten down.
        Recipients claim vested tokens from their own pot.
      </p>
      <div className="catalog-stats">
        <article>
          <span>Schedule</span>
          <strong>{scheduleLabel(vesting.schedule)}</strong>
        </article>
        <article>
          <span>Kind</span>
          <strong>{formatStatus(vesting.kind)}</strong>
        </article>
        <article>
          <span>Vested</span>
          <strong>{formatAmount(vested)}</strong>
        </article>
        <article>
          <span>Claimed</span>
          <strong>{formatAmount(vesting.alreadyClaimed)}</strong>
        </article>
      </div>
      <p className="catalog-muted">
        {vesting.startTime === 0
          ? "Start time is not stamped yet."
          : `Started ${formatUnix(vesting.startTime)}. ${formatAmount(remaining)} still in the ${vesting.kind} pot.`}
        {vesting.liquidationTimestamp !== 0 ? " Team write-down is stamped." : null}
      </p>
      <VestingActions mint={coin.mint} />
    </section>
  );
}
