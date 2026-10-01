"use client";

import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { formatAmount, formatUnix } from "@/lib/catalog/format";
import type { CoinStake } from "@/lib/catalog/types";

export function StakeForm({
  stake,
  amount,
  busy,
  explorerUrl,
  onAmount,
  onStake,
  onUnstake,
}: {
  stake: CoinStake;
  amount: string;
  busy: boolean;
  explorerUrl: string | null;
  onAmount: (value: string) => void;
  onStake: () => void;
  onUnstake: () => void;
}) {
  return (
    <>
      <CoinStats
        items={[
          { label: "Staked", value: formatAmount(stake.staked) },
          { label: "Voting weight", value: formatAmount(stake.weight) },
          { label: "Voter lock", value: stake.voterLockedUntil ? `Until ${formatUnix(stake.voterLockedUntil)}` : "Unlocked" },
          { label: "Wallet", value: formatAmount(stake.walletBalance) },
        ]}
      />
      <div className="coin-actions">
        <label className="coin-field">
          <span>Amount</span>
          <input inputMode="decimal" value={amount} disabled={busy} onChange={(event) => onAmount(event.target.value)} />
        </label>
        <div className="coin-buttons">
          <button type="button" className="button button-primary" disabled={busy} onClick={onStake}>
            {busy ? "Signing…" : "Stake"}
          </button>
          <button type="button" className="button button-ghost" disabled={busy} onClick={onUnstake}>
            {busy ? "Signing…" : "Unstake"}
          </button>
        </div>
        {explorerUrl ? (
          <p className="coin-note">
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View transaction
            </a>
          </p>
        ) : null}
      </div>
    </>
  );
}
