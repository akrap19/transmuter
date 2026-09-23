"use client";

import { useState } from "react";
import { formatAmount, formatUnix } from "@/lib/catalog/format";
import { evaluateCastVote } from "@/lib/catalog/governance";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import type { CoinStake, CoinVote } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  closed: "This vote window has closed.",
  weight: "Snapshot weight is zero. Stake before the vote opens.",
};

export function VoteActions({ vote, stake }: { vote: CoinVote; stake: CoinStake }) {
  const [message, setMessage] = useState<string | null>(null);

  function run(yes: boolean) {
    const result = evaluateCastVote(vote, stake, Math.floor(Date.now() / 1000), yes);
    if (!result.ok) {
      setMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    setMessage(
      `Ready to sign ${result.yes ? "YES" : "NO"} with weight ${formatAmount(result.weight)}. Voter-lock until ${formatUnix(result.lockUntil)}. ${CATALOG_NOTICE}`,
    );
  }

  return (
    <>
      <div className="coin-buttons">
        <button type="button" className="button button-primary" onClick={() => run(true)}>
          Vote yes
        </button>
        <button type="button" className="button button-ghost" onClick={() => run(false)}>
          Vote no
        </button>
      </div>
      {message ? <p className="coin-note">{message}</p> : null}
    </>
  );
}
