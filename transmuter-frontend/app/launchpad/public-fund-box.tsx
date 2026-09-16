"use client";

import type { ReactNode } from "react";
import { TREASURY_ASK, TREASURY_ACCEPT, COMBINED_BACKING_MIN } from "@/lib/launchpad/floors";
import { formatMcap } from "@/lib/launchpad/launch-solver";
import { useLaunchpad } from "./launchpad-context";

export function PublicFundBox() {
  const { launchSolve: L } = useLaunchpad();

  const intro = (
    <p style={{ fontSize: 10.5, color: "#bbb", lineHeight: 1.7, marginBottom: 14 }}>
      This is the outcome, not a set of dials. Escrow takes the fixed amount the team asked
      for, the Liquidity Pool takes exactly what it needs to pair its token allocation at the
      sale price, and the Treasury takes everything left. The wizard sizes the raise so
      treasury starts at a {(TREASURY_ASK * 100).toFixed(0)}% of MCP ask. On-chain, conversion
      slippage can land it as low as {(TREASURY_ACCEPT * 100).toFixed(0)}%; below that the
      sale voids.{" "}
      <strong style={{ color: "var(--tm-green)" }}>
        Treasury plus LP cash must still clear {(COMBINED_BACKING_MIN * 100).toFixed(0)}% of MCP
        on-chain
      </strong>
      . A realised treasury between {(TREASURY_ACCEPT * 100).toFixed(0)}% and{" "}
      {(TREASURY_ASK * 100).toFixed(0)}% is a shortfall event, not an automatic void.
    </p>
  );

  const feasible = L?.feasible && L.lpFrac && L.treasFrac && L.escrowFrac;
  const lpPctP = feasible ? L.lpFrac! * 100 : null;
  const treasPctP = feasible ? L.treasFrac! * 100 : null;
  const escPctP = feasible ? L.escrowFrac! * 100 : null;

  return (
    <div className="public-fund-box" id="publicFundBox">
      <div className="public-fund-title">💰 Public Sale Proceeds - Launch Allocation</div>
      {intro}

      <FundRow
        label="🌊 → Liquidity Pool"
        color="var(--tm-cyan)"
        pct={lpPctP}
        usd={feasible ? L.lpCash ?? 0 : null}
        note={
          feasible
            ? `Automatic: pairing your ${((L.lpPct ?? 0) * 100).toFixed(0)}% LP token allocation at the sale price takes exactly this much. Not adjustable.`
            : "Set a supply, a raise, and allocations the sale can actually fund."
        }
      />
      <FundRow
        label="🏛️ → Treasury"
        color="var(--tm-gold)"
        pct={treasPctP}
        usd={feasible ? L.treasury ?? 0 : null}
        note={
          feasible ? (
            <>
              Everything left after the LP pairs and escrow is funded:{" "}
              <strong style={{ color: "var(--tm-green)" }}>
                {((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP
              </strong>
              . Wizard ask is {(TREASURY_ASK * 100).toFixed(0)}%; chain accepts down to{" "}
              {(TREASURY_ACCEPT * 100).toFixed(0)}%.
            </>
          ) : (
            `Everything left after the LP pairs and escrow is funded. Wizard ask ${(TREASURY_ASK * 100).toFixed(0)}% of MCP; on-chain accept floor ${(TREASURY_ACCEPT * 100).toFixed(0)}%.`
          )
        }
      />
      <FundRow
        label="🛟 → Runway escrow"
        color="#9aa3b2"
        pct={escPctP}
        usd={feasible ? L.escrowNeed ?? 0 : null}
        note="The fixed amount the team asked for, vested and governed. It is a target, not a leftover: it is funded before the treasury takes what remains."
      />

      <div className={`public-fund-warning${!feasible && L ? " visible" : ""}`}>
        ⚠️ This configuration cannot fund itself: the LP pairing plus the treasury minimum
        exceed what the sale brings in. Sell more supply, or lower the LP allocation or the
        treasury target.
      </div>

      {feasible && (
        <div className="public-fund-summary" id="pubFundSummary">
          Minimum raise required:{" "}
          <strong style={{ color: "var(--tm-green)" }}>${formatMcap(L.R ?? 0)}</strong>
          {" "}· Treasury receives:{" "}
          <strong style={{ color: "var(--tm-gold)" }}>${formatMcap(L.treasury ?? 0)}</strong>
          {" "}· Treasury ask ({(TREASURY_ASK * 100).toFixed(0)}% MCP):{" "}
          <strong style={{ color: "var(--tm-pink)" }}>${formatMcap((L.mcp ?? 0) * TREASURY_ASK)}</strong>
        </div>
      )}
    </div>
  );
}

function FundRow({
  label,
  color,
  pct,
  usd,
  note,
}: {
  label: string;
  color: string;
  pct: number | null;
  usd: number | null;
  note: ReactNode;
}) {
  return (
    <>
      <div className="public-fund-row">
        <span className="public-fund-label" style={{ color }}>
          {label}
        </span>
        <div className="public-fund-slider" style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${color}33` }}>
            <div
              style={{
                height: "100%",
                borderRadius: 2,
                background: color,
                width: pct !== null ? `${Math.min(100, pct)}%` : "0%",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
        <span className="public-fund-val" style={{ color }}>
          {pct !== null && usd !== null
            ? `${pct.toFixed(1)}%  ·  $${formatMcap(usd)}`
            : "—"}
        </span>
      </div>
      <div className="small-note" style={{ margin: "-4px 0 10px" }}>
        {note}
      </div>
    </>
  );
}
