"use client";

import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { formatAmount, formatUnix } from "@/lib/catalog/format";
import { VOTER_LOCK_SECS, evaluateCastVote } from "@/lib/catalog/governance";
import { voterLocked } from "@/lib/catalog/stake";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinStake, CoinVote } from "@/lib/catalog/types";
import { toastError } from "@/lib/toast";

const REASONS: Record<string, string> = {
  closed: "This vote window has closed.",
  weight: "Snapshot weight is zero. Stake before the vote opens.",
  voted: "You already voted. A wallet can vote once.",
};

export function VoteActions({
  vote,
  stake,
  chain,
  onConfirmed,
}: {
  vote: CoinVote;
  stake: CoinStake;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  const tx = useSubmitHolder(onConfirmed);
  const alreadyVoted = voterLocked(stake.voterLockedUntil, Math.floor(Date.now() / 1000));

  function run(yes: boolean) {
    const result = evaluateCastVote(vote, stake, Math.floor(Date.now() / 1000), yes);
    if (!result.ok) {
      toastError(REASONS[result.reason] ?? result.reason);
      return;
    }
    void tx.run("castLiquidationVote", chain, { yes });
  }

  if (alreadyVoted) {
    return <p className="coin-note">{REASONS.voted}</p>;
  }

  return (
    <>
      <div className="coin-buttons">
        <button type="button" className="button button-primary" disabled={tx.busy} onClick={() => run(true)}>
          {tx.busy ? "Signing…" : "Vote yes"}
        </button>
        <button type="button" className="button button-ghost" disabled={tx.busy} onClick={() => run(false)}>
          Vote no
        </button>
      </div>
      {tx.explorerUrl ? (
        <>
          <p className="coin-note">
            Cast with weight {formatAmount(stake.weight)}. Voter-lock until {formatUnix(vote.closesAt + VOTER_LOCK_SECS)}.
          </p>
          <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
            View transaction
            <span aria-hidden="true">↗</span>
          </a>
        </>
      ) : null}
    </>
  );
}
