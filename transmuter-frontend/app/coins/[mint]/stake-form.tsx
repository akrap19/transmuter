"use client";

import { CoinStats } from "@/app/coins/[mint]/coin-stats";
import { formatAmount, formatUnix } from "@/lib/catalog/format";
import { CATALOG_NOTICE } from "@/lib/catalog/mock";
import { evaluateStakeAction } from "@/lib/catalog/stake";
import type { CoinDetail, CoinStake } from "@/lib/catalog/types";

const REASONS: Record<string, string> = {
  balance: "That amount exceeds the wallet balance.",
  status: "Staking is not open for this launch.",
  amount: "Enter an amount greater than zero.",
  credit: "Not enough staked to unstake.",
  lock: "Unstake is voter-locked until the lock expires.",
  liquidated: "Stake is off after liquidation. Unstake remains open.",
};

export function StakeForm({
  stake,
  status,
  amount,
  message,
  symbol,
  onAmount,
  onMessage,
}: {
  stake: CoinStake;
  status: CoinDetail["status"];
  amount: string;
  message: string | null;
  symbol: string;
  onAmount: (value: string) => void;
  onMessage: (value: string) => void;
}) {
  function run(kind: "stake" | "unstake") {
    const now = Math.floor(Date.now() / 1000);
    const result = evaluateStakeAction(status, stake, now, { kind, amount: Number(amount) });
    if (!result.ok) {
      onMessage(REASONS[result.reason] ?? result.reason);
      return;
    }
    onMessage(
      kind === "stake"
        ? `Ready to sign stake of ${formatAmount(result.amount)} ${symbol}. ${CATALOG_NOTICE}`
        : `Ready to sign unstake of ${formatAmount(result.amount)} ${symbol} (gross-up ${formatAmount(result.gross)}). ${CATALOG_NOTICE}`,
    );
  }

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
          <input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} />
        </label>
        <div className="coin-buttons">
          <button type="button" className="button button-primary" onClick={() => run("stake")}>
            Stake
          </button>
          <button type="button" className="button button-ghost" onClick={() => run("unstake")}>
            Unstake
          </button>
        </div>
        {message ? <p className="coin-note">{message}</p> : null}
      </div>
    </>
  );
}
