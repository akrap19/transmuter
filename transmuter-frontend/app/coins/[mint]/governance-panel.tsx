import { LiquidationCranks } from "@/app/coins/[mint]/liquidation-cranks";
import { GovernanceVotes } from "@/app/coins/[mint]/governance-votes";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CatalogEmpty } from "@/components/catalog/catalog-empty";
import { stakingAvailable } from "@/lib/catalog/stake";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import type { CoinDetail } from "@/lib/catalog/types";

const KEEPER =
  "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn keeper";

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
  if (!stakingAvailable(coin.status) && coin.votes.length === 0 && !offers.openVote) return null;

  return (
    <CoinSection
      id="governance"
      title="Governance / Voting"
      lede="Liquidation is a holder vote. The DAO shim reports quorum not met, so a missing body is never silent consent — the holder tally decides. Casting a vote sets voter-lock."
    >
      {chain ? <LiquidationCranks chain={chain} offers={offers} onConfirmed={onConfirmed} /> : null}
      {coin.votes.length === 0 || !chain ? (
        <CatalogEmpty title="No open votes" body="Open a liquidation vote once the trouble gate is on. Any wallet can crank it." />
      ) : (
        <GovernanceVotes
          votes={coin.votes}
          stake={coin.stake}
          governedPct={coin.treasury.reserveMint.governedPct}
          chain={chain}
          onConfirmed={onConfirmed}
        />
      )}
      <p className="coin-note">
        Oracle snapshot and reserve-mint clocks stay with the keeper. From <code>smart contracts/</code>: <code>{KEEPER}</code>
        . That cranks mock_pyth set_price when the feed exists. snapshot_oracle on EOL is the permissionless follow-up once
        the print is fresh.
      </p>
    </CoinSection>
  );
}
