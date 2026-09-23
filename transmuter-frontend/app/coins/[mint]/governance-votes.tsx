"use client";

import { VoteCard } from "@/app/coins/[mint]/vote-card";
import { VoteActions } from "@/app/coins/[mint]/vote-actions";
import { WalletGate } from "@/components/catalog/wallet-gate";
import { getCoinDetail } from "@/lib/catalog/client";
import type { CoinVote } from "@/lib/catalog/types";

export function GovernanceVotes({
  mint,
  votes,
  governedPct,
}: {
  mint: string;
  votes: CoinVote[];
  governedPct: number;
}) {
  return (
    <div className="coin-votes">
      {votes.map((vote) => (
        <VoteCard key={vote.kind} vote={vote} governedPct={governedPct}>
          <WalletGate
            title="Connect to vote"
            body="Casting a vote snapshots weight and sets voter-lock. Wallet address is identity."
          >
            {(wallet) => {
              const stake = getCoinDetail(mint, wallet)?.stake;
              if (!stake) return null;
              return <VoteActions vote={vote} stake={stake} />;
            }}
          </WalletGate>
        </VoteCard>
      ))}
    </div>
  );
}
