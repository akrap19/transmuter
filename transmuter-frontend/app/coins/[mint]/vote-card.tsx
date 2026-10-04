import { CoinProgress } from "@/app/coins/[mint]/coin-progress";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { formatAmount, formatStatus, formatUnix } from "@/lib/catalog/format";
import { voteReadout, voteTally } from "@/lib/catalog/governance";
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
  const readout = voteReadout(vote, tally);
  const yesWidth = Math.min(100, tally.yesBps / 100);
  const quorumWidth = Math.min(100, (tally.reachedQuorumBps / Math.max(vote.quorumBps, 1)) * 100);
  const title =
    vote.kind === "reserve_mint" ? "Mint to Scale" : vote.kind === "liquidation" ? "End of life" : formatStatus(vote.kind);

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
          { label: "Outcome", value: tally.passing ? "Passing" : "Not passing" },
        ]}
      />
      <div className="coin-vote-readout">
        <div className="coin-vote-meter">
          <p>{readout.yesLine}</p>
          <CoinProgress value={yesWidth} label="Share of votes that are yes" />
        </div>
        <div className="coin-vote-meter">
          <p>{readout.turnoutLine}</p>
          <CoinProgress value={Math.min(100, quorumWidth)} label="Progress toward the required turnout" />
        </div>
      </div>
      {children}
    </article>
  );
}
