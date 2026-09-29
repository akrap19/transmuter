"use client";

import Link from "next/link";
import { browserSession, clearMintSecret, clearPendingWire } from "@/lib/launchpad/mint-secret";
import { coinPath } from "@/lib/routes";
import { useLaunchpad } from "./launchpad-context";
import { useWireLaunch } from "./use-wire-launch";
import { WireChecklist } from "./wire-checklist";

export function LaunchWiring() {
  const { state, dispatch } = useLaunchpad();
  const wire = useWireLaunch();
  const tokenHref = state.launchedMint && wire.saleOpen ? coinPath(state.launchedMint) : null;
  const nextLabel = wire.next?.label ?? "Wire launch";

  function abandon() {
    const storage = browserSession();
    if (storage) {
      if (state.launchId != null) clearMintSecret(storage, state.launchId);
      clearPendingWire(storage);
    }
    dispatch({ type: "RESET" });
  }

  return (
    <>
      <div className="launch-success-title">{wire.saleOpen ? "SALE OPEN" : "WIRING IN PROGRESS"}</div>
      <div className="launch-success-name">{state.tokenName}</div>
      <div className="launch-success-meta">
        ${state.tokenTicker} · EOL token · Backed by {state.selectedCToken.name}
      </div>
      <p className="launch-success-desc">
        {wire.saleOpen
          ? `Factory wiring is complete and the sale is open. Deposits in ${state.selectedCToken.name} stay withdrawable until the sale concludes.`
          : "createLaunch landed. Each step below is a permissionless crank. A failed step stays here so you can retry without creating another mint."}
      </p>
      {state.launchedMint && <p className="launch-success-meta">Mint {state.launchedMint}</p>}
      {wire.loading && wire.steps.length === 0 ? <p className="launch-success-meta">Reading the launch from chain…</p> : null}
      {wire.steps.length > 0 ? <WireChecklist steps={wire.steps} /> : null}
      {wire.error ? <p className="wire-banner">{wire.error}</p> : null}
      {wire.explorerUrl ? (
        <p className="launch-success-meta">
          <a href={wire.explorerUrl} target="_blank" rel="noreferrer">
            View last transaction
          </a>
        </p>
      ) : null}
      <div className="launch-success-actions">
        {!wire.saleOpen && (
          <button type="button" className="btn btn-launch" onClick={() => void wire.runNext()} disabled={wire.busy || wire.loading || !wire.next}>
            {wire.busy ? `Sign ${nextLabel}…` : wire.next?.state === "failed" ? `Retry ${nextLabel}` : nextLabel}
          </button>
        )}
        {tokenHref ? (
          <Link href={tokenHref} className="btn btn-outline">
            View Token Page →
          </Link>
        ) : null}
        <button type="button" className="btn btn-outline" onClick={abandon}>
          Launch Another
        </button>
      </div>
      {!wire.connected && !wire.saleOpen ? (
        <p className="launch-success-meta">Connect a wallet to sign the next wiring transaction.</p>
      ) : null}
    </>
  );
}
