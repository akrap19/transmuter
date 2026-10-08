"use client";

export function LaunchDeployBar({
  busy,
  connected,
  missing,
  onBack,
  onLaunch,
}: {
  busy: boolean;
  connected: boolean;
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
          {busy ? "Deploying" : "Deploy token"}
        </button>
      </div>
      {!connected ? (
        <p className="small-note launch-actions-note">Connect wallet to deploy.</p>
      ) : (
        missing.length > 0 && <p className="launch-missing">Missing: {missing.join(", ")}.</p>
      )}
    </>
  );
}
