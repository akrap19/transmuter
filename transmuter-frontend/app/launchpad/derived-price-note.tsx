"use client";

import type { ReactNode } from "react";
import { TREASURY_ASK } from "@/lib/launchpad/floors";
import { formatMcap, formatPrice } from "@/lib/launchpad/launch-solver";
import { useLaunchpad } from "./launchpad-context";

export function DerivedPriceNote({ variant }: { variant: "hint" | "outcome" }) {
  const { launchSolve: L } = useLaunchpad();

  if (variant === "hint") {
    if (L?.clampedUp) {
      return (
        <div className="small-note">
          <span style={{ color: "var(--tm-gold)" }}>
            Raised to the minimum this configuration needs.
          </span>
        </div>
      );
    }
    if (L?.minRaise === 0) {
      return (
        <div className="small-note">
          No escrow need, so there is no minimum: whatever you raise pairs the LP and the
          rest becomes treasury. <strong>Use minimum</strong> has nothing to snap to here.
        </div>
      );
    }
    return (
      <div className="small-note">
        Raise above the minimum to deepen the reserves.{" "}
        <strong>Use minimum</strong> snaps this back to the smallest raise that funds the
        launch.
      </div>
    );
  }

  if (!L || L.needRaise) {
    return (
      <div
        id="derivedPriceNote"
        style={{
          background: "rgba(240,194,75,0.03)",
          border: "1px solid var(--tm-border)",
          borderRadius: 8,
          padding: "14px 16px",
        }}
      >
        <div className="small-note" style={{ margin: 0 }}>
          Enter a supply and a total target raise to price the launch.
        </div>
      </div>
    );
  }

  if (!L.feasible) {
    const isRaiseTooSmall =
      L.treasPctMCP !== undefined && L.treasPctMCP < TREASURY_ASK && (L.minRaise ?? 0) > 0;
    const prefix = isRaiseTooSmall ? "Raise too small." : "Not fundable.";
    const body = isRaiseTooSmall
      ? <>
          After pairing the LP (${formatMcap(L.lpCash ?? 0)}) and funding escrow ($
          {formatMcap(L.escrowNeed ?? 0)}), the treasury would be only{" "}
          {((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP, under the {(TREASURY_ASK * 100).toFixed(0)}% ask. Raise at
          least <strong>${formatMcap(L.minRaise ?? 0)}</strong>, or cut the LP allocation.
        </>
      : <>
          Your LP ({((L.lpPct ?? 0) * 100).toFixed(0)}%) plus the {(TREASURY_ASK * 100).toFixed(0)}% treasury ask needs at
          least as much as the sale ({((L.salePct ?? 0) * 100).toFixed(0)}%) brings in. Sell
          more supply, or lower the LP allocation.
        </>;
    return (
      <div
        style={{
          background: "rgba(240,194,75,0.03)",
          border: "1px solid var(--tm-border)",
          borderRadius: 8,
          padding: "14px 16px",
        }}
      >
        <div className="small-note" style={{ margin: 0 }}>
          <strong style={{ color: "var(--tm-pink)" }}>{prefix}</strong> {body}
        </div>
      </div>
    );
  }

  const strong =
    (L.treasPctMCP ?? 0) >= 0.25
      ? "a strongly backed launch"
      : (L.treasPctMCP ?? 0) >= 0.15
        ? "a well backed launch"
        : "at the backing floor";

  const extraAboveMin =
    L.R && L.minRaise && L.R > L.minRaise * 1.000001
      ? (() => {
          const e = L.R - L.minRaise;
          const toLP = e * ((L.lpPct ?? 0) / (L.salePct ?? 1));
          const toTreas = e - toLP;
          return { e, toLP, toTreas };
        })()
      : null;

  return (
    <div
      style={{
        background: "rgba(240,194,75,0.03)",
        border: "1px solid var(--tm-border)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <OutcomeRow label="Listing" value={`$${formatPrice(L.price ?? 0)}`} color="var(--tm-cyan)" />
      <OutcomeRow label="MCP" value={`$${formatMcap(L.mcp ?? 0)}`} color="var(--tm-gold)" />
      <OutcomeRow label="LP" value={`$${formatMcap(L.lpCash ?? 0)}`} />
      <OutcomeRow label="Escrow" value={`$${formatMcap(L.escrowNeed ?? 0)}`} />
      <OutcomeRow
        label="Treasury"
        value={
          <>
            ${formatMcap(L.treasury ?? 0)}{" "}
            <span style={{ color: "var(--tm-text-dim)" }}>
              ({((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP)
            </span>
          </>
        }
        color="var(--tm-green)"
      />
      <div style={{ marginTop: 9, fontSize: 11, color: "var(--tm-text-dim)", lineHeight: 1.6 }}>
        {strong}.
        {(L.minRaise ?? 0) > 0 && (
          <>
            {" "}
            Minimum raise{" "}
            <strong style={{ color: "var(--tm-text)" }}>
              ${formatMcap(L.minRaise ?? 0)}
            </strong>
            .
          </>
        )}
        {extraAboveMin && (
          <>
            {" "}
            <span style={{ color: "var(--tm-green)" }}>
              ${formatMcap(extraAboveMin.e)}
            </span>{" "}
            above it: ${formatMcap(extraAboveMin.toLP)} pairs the deeper LP, $
            {formatMcap(extraAboveMin.toTreas)} deepens the treasury.
          </>
        )}
      </div>
    </div>
  );
}

function OutcomeRow({
  label,
  value,
  color = "var(--tm-text)",
}: {
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "5px 0",
        borderBottom: "1px solid rgba(240,194,75,0.06)",
      }}
    >
      <span
        style={{
          color: "var(--tm-text-dim)",
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--tm-font-mono)",
          fontSize: 12,
          color,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}
