"use client";

import Link from "next/link";
import { coinPath } from "@/lib/routes";
import { useLaunchpad } from "./launchpad-context";

export function LaunchSuccess() {
  const { state, dispatch } = useLaunchpad();
  const tokenHref = state.launchedMint ? coinPath(state.launchedMint) : null;

  return (
    <div className="launch-success">
      <div className="launch-success-icon">🎉</div>
      <div className="launch-success-title">DEPLOYED - SALE OPEN</div>
      <div className="launch-success-name">{state.tokenName}</div>
      <div className="launch-success-meta">
        ${state.tokenTicker} · Reinforced Token · Backed by {state.selectedCToken.name}
      </div>
      <p className="launch-success-desc">
        Factory createLaunch landed. Your mint is registered; wiring opens the sale. Deposits in{" "}
        {state.selectedCToken.name} stay withdrawable until the sale concludes; once finalized, the
        non-custodial treasury activates and grows with every transaction.
      </p>
      {state.launchedMint && (
        <p className="launch-success-meta">Mint {state.launchedMint}</p>
      )}
      <div className="launch-success-actions">
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "RESET" })}>
          Launch Another
        </button>
        {tokenHref ? (
          <Link href={tokenHref} className="btn btn-launch">
            View Token Page →
          </Link>
        ) : (
          <button type="button" className="btn btn-launch" disabled>
            View Token Page →
          </button>
        )}
      </div>
    </div>
  );
}
