import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { VestingActions } from "@/app/coins/[mint]/vesting-actions";
import { formatAmount, formatStatus, formatUnix } from "@/lib/catalog/format";
import { scheduleLabel } from "@/lib/catalog/schedule";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import { vestedForEntry } from "@/lib/catalog/vesting";
import type { CoinDetail } from "@/lib/catalog/types";

export function VestingPanel({
  coin,
  chain,
  now,
  onConfirmed,
}: {
  coin: CoinDetail;
  chain: HolderSubmit | null;
  now: number;
  onConfirmed: () => void;
}) {
  if (!coin.vesting || !chain) return null;

  const { vesting } = coin;
  const vested = vestedForEntry(vesting, now);
  const remaining = Math.max(0, vesting.totalAllocation - vesting.alreadyClaimed);

  return (
    <CoinSection
      id="vesting"
      title="Vesting"
      lede="Two custody pots, no cross-transfer. Team unvested burns at end of life and totalAllocation is rewritten down. Recipients claim vested tokens from their own pot."
    >
      <CoinStats
        items={[
          { label: "Schedule", value: scheduleLabel(vesting.schedule) },
          { label: "Kind", value: formatStatus(vesting.kind) },
          { label: "Vested", value: formatAmount(vested) },
          { label: "Claimed", value: formatAmount(vesting.alreadyClaimed) },
        ]}
      />
      <p className="coin-note">
        {vesting.startTime === 0
          ? "Start time is not stamped yet."
          : `Started ${formatUnix(vesting.startTime)}. ${formatAmount(remaining)} still in the ${vesting.kind} pot.`}
        {vesting.liquidationTimestamp !== 0 ? " Team write-down is stamped." : null}
      </p>
      <VestingActions vesting={vesting} chain={chain} onConfirmed={onConfirmed} />
    </CoinSection>
  );
}
