"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { browserSession, clearMintSecret, clearPendingWire } from "@/lib/launchpad/mint-secret";
import { coinPath } from "@/lib/routes";
import { useLaunchpad } from "./launchpad-context";
import { useWireLaunch } from "./use-wire-launch";
import { WireChecklist } from "./wire-checklist";

export function WireModal() {
  const { state, dispatch } = useLaunchpad();
  const wire = useWireLaunch();
  const autoStarted = useRef(false);

  // Lock background scroll so the launchpad page stays put behind the overlay.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const canStart = wire.connected && !wire.loading && !wire.saleOpen && wire.steps.length > 0;

  const runAll = wire.runAll;
  const running = wire.running;
  useEffect(() => {
    if (autoStarted.current || !canStart || running) return;
    autoStarted.current = true;
    void runAll();
  }, [canStart, running, runAll]);

  function clearLaunchSession() {
    const storage = browserSession();
    if (!storage) return;
    if (state.launchId != null) clearMintSecret(storage, state.launchId);
    clearPendingWire(storage);
  }

  function abandon() {
    clearLaunchSession();
    dispatch({ type: "RESET" });
  }

  function leaveToToken() {
    clearLaunchSession();
    // Runs after the link has started navigation, so the click is not cancelled.
    // Commit the reset before Next caches this page, so coming back does not reopen the modal.
    flushSync(() => {
      dispatch({ type: "RESET" });
    });
  }

  const tokenHref = state.launchedMint && wire.saleOpen ? coinPath(state.launchedMint) : null;
  const pct = wire.progress.total > 0 ? Math.round((wire.progress.done / wire.progress.total) * 100) : 0;
  const failed = wire.steps.find((step) => step.state === "failed");

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="launch-page wire-portal">
      <div className="wire-modal-backdrop" role="dialog" aria-modal="true" aria-label="Deploy token">
        <div className="wire-modal">
        <div className="launch-success-title">{wire.saleOpen ? "SALE OPEN" : "DEPLOYING TOKEN"}</div>
        <div className="launch-success-name">{state.tokenName}</div>
        <div className="launch-success-meta">
          ${state.tokenTicker} · EOL token · Backed by {state.selectedCToken.name}
        </div>

        {!wire.saleOpen && wire.progress.total > 0 ? (
          <>
            <div className="wire-progress-head">
              <span>
                Step {Math.min(wire.progress.done + 1, wire.progress.total)} of {wire.progress.total}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="wire-progress" aria-hidden="true">
              <div className="wire-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : null}

        {wire.loading && wire.steps.length === 0 ? (
          <p className="launch-success-meta">Reading the launch from chain…</p>
        ) : null}
        {wire.steps.length > 0 ? (
          <WireChecklist steps={wire.steps} activeId={wire.activeStepId} running={wire.running} />
        ) : null}

        <p className="wire-modal-note">
          {wire.saleOpen
            ? `Wiring is complete and the sale is open. Deposits in ${state.selectedCToken.name} stay withdrawable until the sale concludes.`
            : "Each step is signed automatically. We bundle as many steps as fit per transaction, so you approve as few as possible in your wallet."}
        </p>

        {wire.running ? (
          <p className="wire-banner wire-banner-info">
            <span className="wire-spinner" aria-hidden="true" />
            Approve the transaction in your wallet…
          </p>
        ) : failed?.error ? (
          <p className="wire-banner">{failed.error}</p>
        ) : wire.error ? (
          <p className="wire-banner">{wire.error}</p>
        ) : null}

        {wire.explorerUrl ? (
          <a className="wire-tx-link" href={wire.explorerUrl} target="_blank" rel="noreferrer">
            View last transaction
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}

        <div className="launch-success-actions">
          {!wire.saleOpen ? (
            <button
              type="button"
              className="btn btn-launch"
              onClick={() => void wire.runAll()}
              disabled={wire.busy || wire.running || wire.loading || !wire.connected}
            >
              {wire.running ? "Signing…" : failed ? "Retry wiring" : "Continue wiring"}
            </button>
          ) : null}
          {tokenHref ? (
            <Link href={tokenHref} className="btn btn-outline" onNavigate={leaveToToken}>
              View Token Page →
            </Link>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={abandon} disabled={wire.running}>
            {wire.saleOpen ? "Launch Another" : "Start Over"}
          </button>
        </div>

        {!wire.connected && !wire.saleOpen ? (
          <p className="launch-success-meta">Connect a wallet to sign the wiring transactions.</p>
        ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
