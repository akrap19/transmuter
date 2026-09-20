"use client";

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
      <div className="catalog-stats">
        <article>
          <span>Staked</span>
          <strong>{formatAmount(stake.staked)}</strong>
        </article>
        <article>
          <span>Voting weight</span>
          <strong>{formatAmount(stake.weight)}</strong>
        </article>
        <article>
          <span>Voter lock</span>
          <strong>{stake.voterLockedUntil ? `Until ${formatUnix(stake.voterLockedUntil)}` : "Unlocked"}</strong>
        </article>
        <article>
          <span>Wallet</span>
          <strong>{formatAmount(stake.walletBalance)}</strong>
        </article>
      </div>
      <div className="catalog-sale-actions">
        <label className="catalog-field">
          <span>Amount</span>
          <input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} />
        </label>
        <div className="catalog-sale-buttons">
          <button type="button" className="btn btn-gold" onClick={() => run("stake")}>
            Stake
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => run("unstake")}>
            Unstake
          </button>
        </div>
        {message ? <p className="catalog-sale-note">{message}</p> : null}
      </div>
    </>
  );
}
