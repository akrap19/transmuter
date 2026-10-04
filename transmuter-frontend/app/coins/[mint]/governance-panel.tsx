import { LiquidationCranks } from "@/app/coins/[mint]/liquidation-cranks";
import { GovernanceVotes } from "@/app/coins/[mint]/governance-votes";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinDetail } from "@/lib/catalog/types";

export function GovernancePanel({
  coin,
  chain,
  offers,
  onConfirmed,
}: {
  coin: CoinDetail;
  chain: HolderSubmit | null;
  offers: { openVote: boolean; executeVote: boolean };
  onConfirmed: () => void;
}) {
  const hasVotes = coin.votes.length > 0;
  const canCrank = Boolean(chain && (offers.openVote || offers.executeVote));
  if (!hasVotes && !canCrank) return null;

  return (
    <CoinSection
      id="governance"
      title="Governance / Voting"
      lede="Liquidation is a holder vote. The DAO shim reports quorum not met, so a missing body is never silent consent — the holder tally decides. Casting a vote sets voter-lock."
    >
      {canCrank && chain ? <LiquidationCranks chain={chain} offers={offers} onConfirmed={onConfirmed} /> : null}
      {hasVotes && chain ? (
        <GovernanceVotes
          votes={coin.votes}
          stake={coin.stake}
          governedPct={coin.treasury.reserveMint.governedPct}
          chain={chain}
          onConfirmed={onConfirmed}
        />
      ) : null}
    </CoinSection>
  );
}
