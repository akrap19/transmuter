"use client";

import { ScrollRows } from "@/app/coins/[mint]/scroll-rows";
import { VoteCard } from "@/app/coins/[mint]/vote-card";
import { VoteActions } from "@/app/coins/[mint]/vote-actions";
import { WalletGate } from "@/components/catalog/wallet-gate";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinStake, CoinVote } from "@/lib/catalog/types";

export function GovernanceVotes({
  votes,
  stake,
  governedPct,
  chain,
  onConfirmed,
}: {
  votes: CoinVote[];
  stake: CoinStake | null;
  governedPct: number;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  return (
    <ScrollRows className="coin-votes">
      {votes.map((vote) => (
        <VoteCard key={vote.kind} vote={vote} governedPct={governedPct}>
          {vote.kind === "liquidation" && stake ? (
            <WalletGate
              title="Connect to vote"
              body="Casting a vote uses your staked weight and sets voter-lock. The DAO shim reports quorum not met, so holders decide."
            >
              {() => <VoteActions vote={vote} stake={stake} chain={chain} onConfirmed={onConfirmed} />}
            </WalletGate>
          ) : null}
        </VoteCard>
      ))}
    </ScrollRows>
  );
}
