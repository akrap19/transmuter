import { CoinProgress } from "@/app/coins/[mint]/coin-progress";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
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
    <article className="coin-vote">
      <h3>{title}</h3>
      <p>
        {vote.kind === "reserve_mint"
          ? `Path B activates the creator-set governed mint (${governedPct}% of supply). It does not pick a new percentage.`
          : vote.kind.startsWith("escrow_")
            ? "Halt, resume, and advance never move runway USDC; they change the schedule."
            : "14-day holder vote. 67% supermajority with 10% quorum of circulating supply."}
      </p>
      <CoinStats
        items={[
          { label: "Yes", value: formatAmount(vote.yesWeight) },
          { label: "No", value: formatAmount(vote.noWeight) },
          { label: "Closes", value: formatUnix(vote.closesAt) },
          { label: "Outcome", value: outcome.passing ? "Passing" : "Not passing" },
        ]}
      />
      <p className="coin-note">
        Yes {formatBps(tally.yesBps)} of participating (need {formatBps(vote.passBps)}). Quorum{" "}
        {formatBps(tally.reachedQuorumBps)} of circulating (need {formatBps(vote.quorumBps)}). Denom{" "}
        {formatAmount(vote.denom)}. {outcome.decidedByHolders ? "DAO shim: quorum not met; holders decide." : null}
      </p>
      <CoinProgress value={yesWidth} label="Yes share" />
      <CoinProgress value={Math.min(100, quorumWidth)} label="Quorum" />
      {children}
    </article>
  );
}
