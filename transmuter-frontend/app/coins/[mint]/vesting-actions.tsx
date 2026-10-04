"use client";

import { useSubmitHolder } from "@/app/coins/[mint]/use-submit-holder";
import { WalletGate } from "@/components/catalog/wallet-gate";
import type { HolderSubmit } from "@/lib/catalog/submit-holder";
import { evaluateVestingClaim } from "@/lib/catalog/vesting";
import type { CoinVesting } from "@/lib/catalog/types";
import { toastError } from "@/lib/toast";

const REASONS: Record<string, string> = {
  recipient: "Only the vesting recipient can claim this pot.",
  notStarted: "Start time has not been stamped.",
  zero: "Nothing is claimable yet.",
};

export function VestingActions({
  vesting,
  chain,
  onConfirmed,
}: {
  vesting: CoinVesting;
  chain: HolderSubmit;
  onConfirmed: () => void;
}) {
  const tx = useSubmitHolder(onConfirmed);

  return (
    <WalletGate
      title="Connect to claim vested tokens"
      body="Vesting claims are signed by the recipient wallet. There is no login."
    >
      {(wallet) => (
        <div className="coin-actions">
          <div className="coin-buttons">
            <button
              type="button"
              className="button button-primary"
              disabled={tx.busy || !chain.vesting}
              onClick={() => {
                const result = evaluateVestingClaim(vesting, wallet, Math.floor(Date.now() / 1000));
                if (!result.ok) {
                  toastError(REASONS[result.reason] ?? result.reason);
                  return;
                }
                void tx.run("vestingClaim", chain);
              }}
            >
              {tx.busy ? "Signing…" : "Claim vested"}
            </button>
          </div>
          {!chain.vesting ? <p className="coin-note">This wallet has no vesting entry on the launch.</p> : null}
          {tx.explorerUrl ? (
            <a className="coin-tx-link" href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
              View transaction
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      )}
    </WalletGate>
  );
}
