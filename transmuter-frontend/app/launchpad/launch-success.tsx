"use client";

import { useLaunchpad } from "./launchpad-context";

export function LaunchSuccess() {
  const { state, dispatch } = useLaunchpad();

  return (
    <div className="launch-success">
      <div className="launch-success-icon">🎉</div>
      <div className="launch-success-title">DEPLOYED - SALE OPEN</div>
      <div className="launch-success-name">{state.tokenName}</div>
      <div className="launch-success-meta">
        ${state.tokenTicker} · Reinforced Token · Backed by {state.selectedCToken.name}
      </div>
      <p className="launch-success-desc">
        Your sale is now open on Transmuter. Deposits in {state.selectedCToken.name} stay
        withdrawable until the sale concludes; once finalized, the non-custodial treasury
        activates and grows with every transaction.
      </p>
      <div className="launch-success-actions">
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "RESET" })}>
          Launch Another
        </button>
        <button type="button" className="btn btn-launch">View Token Page →</button>
      </div>
    </div>
  );
}
