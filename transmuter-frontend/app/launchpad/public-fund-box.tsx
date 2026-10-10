"use client";

import type { ReactNode } from "react";
import { TREASURY_ACCEPT, COMBINED_BACKING_MIN } from "@/lib/launchpad/floors";
import { formatMcap } from "@/lib/launchpad/launch-solver";
import { fundProceedsReady } from "@/lib/launchpad/public-fund";
import { FieldHint } from "./field-hint";
import { useLaunchpad } from "./launchpad-context";

export function PublicFundBox() {
  const { state, launchSolve: L } = useLaunchpad();
  const ask = state.treasuryBackingPct;

  const intro = (
    <>
      This is the outcome, not a set of dials. Escrow takes the amount the team asked for,
      the liquidity pool takes exactly what it needs to pair its allocation, and the treasury
      takes everything left. The wizard sizes the raise so treasury starts at a {ask}% of MCP
      ask. On-chain, conversion slippage can land it as low as {(TREASURY_ACCEPT * 100).toFixed(0)}%;
      below that the sale voids. Treasury plus liquidity-pool cash must still clear{" "}
      {(COMBINED_BACKING_MIN * 100).toFixed(0)}% of MCP. A realised treasury between{" "}
      {(TREASURY_ACCEPT * 100).toFixed(0)}% and {ask}% is a shortfall, not an automatic void.
    </>
  );

  const ready = fundProceedsReady(L);
  const lpPctP = ready ? L.lpFrac * 100 : null;
  const treasPctP = ready ? L.treasFrac * 100 : null;
  const escPctP = ready ? L.escrowFrac * 100 : null;

  return (
    <div className="public-fund-box" id="publicFundBox">
      <div className="public-fund-title">
        Public sale proceeds
        <FieldHint label="About public sale proceeds">{intro}</FieldHint>
      </div>

      <FundRow
        label="Liquidity pool"
        pct={lpPctP}
        usd={ready ? L.lpCash ?? 0 : null}
        note={
          ready
            ? `Automatic: pairing your ${((L.lpPct ?? 0) * 100).toFixed(0)}% LP token allocation at the sale price takes exactly this much. Not adjustable.`
            : "Set a supply, a raise, and allocations the sale can actually fund."
        }
      />
      <FundRow
        label="Treasury"
        pct={treasPctP}
        usd={ready ? L.treasury ?? 0 : null}
        note={
          ready ? (
            <>
              Everything left after the liquidity pool pairs and escrow is funded:{" "}
              <strong>{((L.treasPctMCP ?? 0) * 100).toFixed(1)}% of MCP</strong>. Wizard ask is{" "}
              {ask}%; chain accepts down to {(TREASURY_ACCEPT * 100).toFixed(0)}%.
            </>
          ) : (
            `Everything left after the LP pairs and escrow is funded. Wizard ask ${ask}% of MCP; on-chain accept floor ${(TREASURY_ACCEPT * 100).toFixed(0)}%.`
          )
        }
      />
      <FundRow
        label="Runway escrow"
        pct={escPctP}
        usd={ready ? L.escrowNeed ?? 0 : null}
        note="The fixed amount the team asked for, vested and governed. It is a target, not a leftover: it is funded before the treasury takes what remains."
      />

      <div className={`public-fund-warning${L && !ready ? " visible" : ""}`}>
        This configuration cannot fund itself: the liquidity-pool pairing plus the treasury minimum
        exceed what the sale brings in. Sell more supply, or lower the LP allocation or the
        treasury target.
      </div>

      {ready ? (
        <div className="public-fund-summary" id="pubFundSummary">
          Minimum raise <strong>${formatMcap(L.R ?? 0)}</strong>
          {" "}· Treasury receives <strong>${formatMcap(L.treasury ?? 0)}</strong>
          {" "}· Treasury ask ({ask}% MCP) <strong>${formatMcap((L.mcp ?? 0) * (ask / 100))}</strong>
        </div>
      ) : null}
    </div>
  );
}

function FundRow({
  label,
  pct,
  usd,
  note,
}: {
  label: string;
  pct: number | null;
  usd: number | null;
  note: ReactNode;
}) {
  return (
    <>
      <div className="public-fund-row">
        <span className="public-fund-label">
          {label}
          <FieldHint label={`About ${label}`}>{note}</FieldHint>
        </span>
        <div className="public-fund-slider">
          <div className="fund-meter">
            <div
              className="fund-meter-fill"
              style={{ width: pct !== null ? `${Math.min(100, pct)}%` : "0%" }}
            />
          </div>
        </div>
        <span className="public-fund-val">
          {pct !== null && usd !== null ? `${pct.toFixed(1)}% · $${formatMcap(usd)}` : "—"}
        </span>
      </div>
    </>
  );
}
