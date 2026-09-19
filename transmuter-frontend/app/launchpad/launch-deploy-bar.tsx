"use client";

import type { LaunchStatus } from "@/lib/launchpad/types";

export function LaunchDeployBar({
  busy,
  connected,
  error,
  status,
  onBack,
  onLaunch,
}: {
  busy: boolean;
  connected: boolean;
  error: string | null;
  status: LaunchStatus;
  onBack: () => void;
  onLaunch: () => void;
}) {
  return (
    <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
      <button type="button" className="btn btn-outline" onClick={onBack}>
        ← Back
      </button>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        {error && (
          <div className="small-note" style={{ color: "var(--tm-pink)", textAlign: "right" }}>
            {error}
          </div>
        )}
        {!connected && (
          <div className="small-note">Connect a wallet to sign the Factory createLaunch transaction.</div>
        )}
        <button type="button" className="btn btn-launch" onClick={onLaunch} disabled={busy}>
          {busy ? (status === "uploading" ? "Uploading metadata…" : "Sign createLaunch…") : "🚀 Deploy Token"}
        </button>
      </div>
    </div>
  );
}
