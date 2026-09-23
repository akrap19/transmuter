import { CoinProgress } from "@/app/coins/[mint]/coin-progress";
import { CoinSection } from "@/app/coins/[mint]/coin-section";
import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { EscrowActions } from "@/app/coins/[mint]/escrow-actions";
import { formatStatus, formatUsd, formatUnix } from "@/lib/catalog/format";
import { releasedToDate } from "@/lib/catalog/escrow";
import { CATALOG_NOW } from "@/lib/catalog/mock";
import { scheduleLabel } from "@/lib/catalog/schedule";
import type { CoinDetail } from "@/lib/catalog/types";

export function EscrowPanel({ coin }: { coin: CoinDetail }) {
  if (!coin.escrow) return null;

  const { escrow } = coin;
  const released = releasedToDate(escrow, CATALOG_NOW);
  const width = escrow.fundedPrincipal <= 0 ? 0 : Math.min(100, (released / escrow.fundedPrincipal) * 100);

  return (
    <CoinSection
      id="escrow"
      title="Runway Escrow"
      lede={
        <>
          The team recipient draws vested USDC. Halt, resume, and advance are holder votes — they change the schedule and
          never move the money. <a href="#governance">Open Governance</a> to vote.
        </>
      }
    >
      <CoinStats
        items={[
          { label: "Schedule", value: scheduleLabel(escrow.schedule) },
          { label: "Released", value: formatUsd(released) },
          { label: "Drawn", value: formatUsd(escrow.alreadyDrawn) },
          { label: "Status", value: formatStatus(escrow.status) },
        ]}
      />
      <CoinProgress value={width} label="Escrow released" />
      <p className="coin-note">
        Principal {formatUsd(escrow.fundedPrincipal)}
        {escrow.startTime === 0 ? ". Start time is not stamped." : ` since ${formatUnix(escrow.startTime)}.`}
        {escrow.advanceUnlocked > 0 ? ` Advance unlocked ${formatUsd(escrow.advanceUnlocked)}.` : null}
      </p>
      <EscrowActions mint={coin.mint} />
    </CoinSection>
  );
}
