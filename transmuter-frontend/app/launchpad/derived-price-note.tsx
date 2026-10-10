"use client";

import type { ReactNode } from "react";
import { formatMcap, formatPrice } from "@/lib/launchpad/launch-solver";
import { useLaunchpad } from "./launchpad-context";

export function DerivedPriceNote({ variant }: { variant: "hint" | "outcome" }) {
  const { state, launchSolve: L } = useLaunchpad();
  const ask = state.treasuryBackingPct;

  if (variant === "hint") {
    if (L?.clampedUp) {
      return <strong>Raised to the minimum this configuration needs.</strong>;
    }
    if (L?.minRaise === 0) {
      return (
        <>
          No escrow need, so there is no minimum: whatever you raise pairs the LP and the
          rest becomes treasury. <strong>Use minimum</strong> has nothing to snap to here.
        </>
      );
    }
    return (
      <>
        Raise above the minimum to deepen the reserves.{" "}
        <strong>Use minimum</strong> snaps this back to the smallest raise that funds the
        launch.
      </>
    );
  }

  if (!L || L.needRaise) {
    return (
      <div id="derivedPriceNote" className="outcome-card is-placeholder">
        <div className="small-note outcome-foot">
          Enter a supply and a total target raise to price the launch.
        </div>
      </div>
    );
  }

  if (!L.feasible) {
    const isRaiseTooSmall =
      L.treasPctMCP !== undefined && L.treasPctMCP < ask / 100 && (L.minRaise ?? 0) > 0;
    const prefix = isRaiseTooSmall ? "Raise too small." : "Not fundable.";
    const body = isRaiseTooSmall
      ? <>
          After pairing the LP (${formatMcap(L.lpCash ?? 0)}) and funding escrow ($
          {formatMcap(L.escrowNeed ?? 0)}), the treasury would be only{" "}
          {((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP, under the {ask}% ask. Raise at
          least <strong>${formatMcap(L.minRaise ?? 0)}</strong>, or cut the LP allocation.
        </>
      : <>
          Your LP ({((L.lpPct ?? 0) * 100).toFixed(0)}%) plus the {ask}% treasury ask needs at
          least as much as the sale ({((L.salePct ?? 0) * 100).toFixed(0)}%) brings in. Sell
          more supply, or lower the LP allocation.
        </>;
    return (
      <div className="outcome-card">
        <div className="small-note outcome-foot">
          <strong className="outcome-warn">{prefix}</strong> {body}
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
    <div className="outcome-card">
      <OutcomeRow label="Listing" value={`$${formatPrice(L.price ?? 0)}`} />
      <OutcomeRow label="Market cap" value={`$${formatMcap(L.mcp ?? 0)}`} />
      <OutcomeRow label="Liquidity pool" value={`$${formatMcap(L.lpCash ?? 0)}`} />
      <OutcomeRow label="Escrow" value={`$${formatMcap(L.escrowNeed ?? 0)}`} />
      <OutcomeRow
        label="Treasury"
        value={`$${formatMcap(L.treasury ?? 0)} (${((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP)`}
      />
      <p className="small-note outcome-foot">
        {strong}.
        {(L.minRaise ?? 0) > 0 && (
          <>
            {" "}
            Minimum raise <strong>${formatMcap(L.minRaise ?? 0)}</strong>.
          </>
        )}
        {extraAboveMin && (
          <>
            {" "}
            <strong>${formatMcap(extraAboveMin.e)}</strong> above it: $
            {formatMcap(extraAboveMin.toLP)} pairs the deeper liquidity pool, $
            {formatMcap(extraAboveMin.toTreas)} deepens the treasury.
          </>
        )}
      </p>
    </div>
  );
}

function OutcomeRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="outcome-row">
      <span className="outcome-label">{label}</span>
      <span className="outcome-value">{value}</span>
    </div>
  );
}
