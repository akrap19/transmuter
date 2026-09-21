import { EscrowActions } from "@/app/coins/[mint]/escrow-actions";
import { formatStatus, formatUsd, formatUnix } from "@/lib/catalog/format";
import { releasedToDate } from "@/lib/catalog/escrow";
import { CATALOG_NOW } from "@/lib/catalog/mock";
import { scheduleLabel } from "@/lib/catalog/schedule";
import type { CoinDetail } from "@/lib/catalog/types";

export function EscrowPanel({ coin }: { coin: CoinDetail }) {
  if (!coin.escrow) return null;

  const { escrow } = coin;
  const released = releasedToDate(escrow, CATALOG_NOW);
  const width = escrow.fundedPrincipal <= 0 ? 0 : Math.min(100, (released / escrow.fundedPrincipal) * 100);

  return (
    <section className="catalog-section" id="escrow">
      <h2>Runway Escrow</h2>
      <p>
        The team recipient draws vested USDC. Halt, resume, and advance are holder votes — they change the schedule and
        never move the money.{" "}
        <a href="#governance">Open Governance</a> to vote.
      </p>
      <div className="catalog-stats">
        <article>
          <span>Schedule</span>
          <strong>{scheduleLabel(escrow.schedule)}</strong>
        </article>
        <article>
          <span>Released</span>
          <strong>{formatUsd(released)}</strong>
        </article>
        <article>
          <span>Drawn</span>
          <strong>{formatUsd(escrow.alreadyDrawn)}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{formatStatus(escrow.status)}</strong>
        </article>
      </div>
      <div className="catalog-progress" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label="Escrow released">
        <i style={{ width: `${width}%` }} />
      </div>
      <p className="catalog-muted">
        Principal {formatUsd(escrow.fundedPrincipal)}
        {escrow.startTime === 0 ? ". Start time is not stamped." : ` since ${formatUnix(escrow.startTime)}.`}
        {escrow.advanceUnlocked > 0 ? ` Advance unlocked ${formatUsd(escrow.advanceUnlocked)}.` : null}
      </p>
      <EscrowActions mint={coin.mint} />
    </section>
  );
}
