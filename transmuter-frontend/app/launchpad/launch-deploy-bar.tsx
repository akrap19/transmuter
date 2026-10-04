"use client";

import type { LaunchStatus } from "@/lib/launchpad/types";

export function LaunchDeployBar({
  busy,
  connected,
  status,
  missing,
  onBack,
  onLaunch,
}: {
  busy: boolean;
  connected: boolean;
  status: LaunchStatus;
  missing: readonly string[];
  onBack: () => void;
  onLaunch: () => void;
}) {
  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn btn-outline" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn btn-launch" onClick={onLaunch} disabled={busy}>
          {busy ? (status === "uploading" ? "Uploading metadata…" : "Sign createLaunch…") : "Deploy token"}
        </button>
      </div>
      {missing.length > 0 && (
        <p className="launch-missing">Missing: {missing.join(", ")}.</p>
      )}
      {!connected && (
        <p className="small-note launch-actions-note">
          Connect a wallet to sign the Factory createLaunch transaction.
        </p>
      )}
    </>
  );
}
