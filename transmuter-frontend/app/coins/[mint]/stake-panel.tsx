import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { StakeActions } from "@/app/coins/[mint]/stake-actions";
import { stakingAvailable } from "@/lib/catalog/stake";
import type { CoinDetail } from "@/lib/catalog/types";

export function StakePanel({ coin }: { coin: CoinDetail }) {
  if (!stakingAvailable(coin.status) || !coin.stake) return null;

  return (
    <CoinSection
      title="Stake / Unstake"
      lede="Stake and unstake are free both ways. Unstake returns only to this wallet. Gross-up is a no-op while the fee is 0. Voting weight is the snapshot frozen at vote open; the denominator is votable circulating supply, never staked supply."
    >
      <CoinStats
        items={[
          { label: "Fee", value: `${coin.stake.feeBps} bps` },
          { label: "Stake path", value: coin.stake.liquidated ? "Off" : "Open" },
          { label: "Unstake", value: "Open" },
          { label: "Gross-up", value: coin.stake.feeBps === 0 ? "No-op" : "On" },
        ]}
      />
      <p className="coin-note">
        {coin.stake.liquidated
          ? "After liquidation, stake is off and unstake stays on."
          : "Casting a vote sets voter-lock. Latest expiry wins."}
      </p>
      <StakeActions mint={coin.mint} status={coin.status} />
    </CoinSection>
  );
}
