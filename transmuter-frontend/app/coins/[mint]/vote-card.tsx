import { formatAmount, formatBps, formatStatus, formatUnix } from "@/lib/catalog/format";
import { holderOutcome, voteTally } from "@/lib/catalog/governance";
import type { CoinVote } from "@/lib/catalog/types";
import type { ReactNode } from "react";

export function VoteCard({
  vote,
  governedPct,
  children,
}: {
  vote: CoinVote;
  governedPct: number;
  children?: ReactNode;
}) {
  const tally = voteTally(vote);
  const outcome = holderOutcome(tally, false);
  const yesWidth = Math.min(100, tally.yesBps / 100);
  const quorumWidth = Math.min(100, (tally.reachedQuorumBps / Math.max(vote.quorumBps, 1)) * 100);
  const title = vote.kind === "reserve_mint" ? "Reserve mint Path B" : formatStatus(vote.kind);

  return (
    <article className="catalog-vote-card">
      <h3>{title}</h3>
      <p>
        {vote.kind === "reserve_mint"
          ? `Path B activates the creator-set governed mint (${governedPct}% of supply). It does not pick a new percentage.`
          : vote.kind.startsWith("escrow_")
            ? "Halt, resume, and advance never move runway USDC; they change the schedule."
            : "14-day holder vote. 67% supermajority with 10% quorum of circulating supply."}
      </p>
      <div className="catalog-stats">
        <article>
          <span>Yes</span>
          <strong>{formatAmount(vote.yesWeight)}</strong>
        </article>
        <article>
          <span>No</span>
          <strong>{formatAmount(vote.noWeight)}</strong>
        </article>
        <article>
          <span>Closes</span>
          <strong>{formatUnix(vote.closesAt)}</strong>
        </article>
        <article>
          <span>Outcome</span>
          <strong>{outcome.passing ? "Passing" : "Not passing"}</strong>
        </article>
      </div>
      <p className="catalog-muted">
        Yes {formatBps(tally.yesBps)} of participating (need {formatBps(vote.passBps)}). Quorum{" "}
        {formatBps(tally.reachedQuorumBps)} of circulating (need {formatBps(vote.quorumBps)}). Denom{" "}
        {formatAmount(vote.denom)}. {outcome.decidedByHolders ? "DAO shim: quorum not met; holders decide." : null}
      </p>
      <div className="catalog-progress" role="progressbar" aria-valuenow={yesWidth} aria-valuemin={0} aria-valuemax={100} aria-label="Yes share">
        <i style={{ width: `${yesWidth}%` }} />
      </div>
      <div className="catalog-progress" role="progressbar" aria-valuenow={Math.min(100, quorumWidth)} aria-valuemin={0} aria-valuemax={100} aria-label="Quorum">
        <i style={{ width: `${quorumWidth}%` }} />
      </div>
      {children}
    </article>
  );
}
