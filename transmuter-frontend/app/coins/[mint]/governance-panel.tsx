import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { GovernanceVotes } from "@/app/coins/[mint]/governance-votes";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { stakingAvailable } from "@/lib/catalog/stake";
import type { CoinDetail } from "@/lib/catalog/types";

export function GovernancePanel({ coin }: { coin: CoinDetail }) {
  if (!stakingAvailable(coin.status) && coin.votes.length === 0) return null;

  return (
    <CoinSection
      id="governance"
      title="Governance / Voting"
      lede="Liquidation, Path B reserve mint, and escrow halt/resume/advance are holder votes. DAO and council shims report quorum not met, so a missing body is never silent consent — the holder tally decides. Casting a vote sets voter-lock."
    >
      {coin.votes.length === 0 ? (
        <CatalogEmpty title="No open votes" body="Tallies appear here when a liquidation, Path B, or escrow proposal is open." />
      ) : (
        <GovernanceVotes mint={coin.mint} votes={coin.votes} governedPct={coin.treasury.reserveMint.governedPct} />
      )}
    </CoinSection>
  );
}
