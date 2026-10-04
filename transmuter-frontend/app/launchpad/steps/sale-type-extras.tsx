"use client";

import { computeOverflowFromState } from "@/lib/launchpad/overflow-calc";
import { useLaunchpad } from "../launchpad-context";

export function SaleTypeExtras() {
  const { state, setField } = useLaunchpad();
  const overflow = state.saleType === "overflow" ? computeOverflowFromState(state) : null;

  if (state.saleType === "dutch") {
    return (
      <div className="form-row cols-2">
        <div className="field">
          <label className="field-label">Start Price <span className="badge required">Required</span></label>
          <div className="input-wrap">
            <input type="number" placeholder="0.010" step={0.000001} min={0} value={state.dutchStartPrice}
              onChange={(e) => setField("dutchStartPrice", e.target.value)} />
            <span className="input-suffix">USD</span>
          </div>
          <div className="small-note">Opening price. Must sit above the floor. Decays down toward it.</div>
        </div>
        <div className="field">
          <label className="field-label">Decay Step</label>
          <div className="input-wrap">
            <input type="number" step={0.1} min={0.2} max={10} value={state.dutchDecayRate}
              onChange={(e) => setField("dutchDecayRate", e.target.value)} />
            <span className="input-suffix">% / interval</span>
          </div>
          <div className="small-note">How much the price drops each interval. 0.2 to 10 percent of the start price.</div>
        </div>
        <div className="field">
          <label className="field-label">Decay Interval</label>
          <div className="input-wrap">
            <input type="number" step={1} min={2} max={60} value={state.dutchDecayInterval}
              onChange={(e) => setField("dutchDecayInterval", e.target.value)} />
            <span className="input-suffix">minutes</span>
          </div>
          <div className="small-note">How often the price steps down. 2 to 60 minutes.</div>
        </div>
      </div>
    );
  }

  if (state.saleType === "overflow") {
    return (
      <div id="overflowParams">
        <div className="form-row cols-2">
          <div className="field">
            <label className="field-label">Raise Cap <span className="badge">Optional</span></label>
            <div className="input-wrap">
              <input type="number" placeholder="No cap" min={0} value={state.overflowCap}
                onChange={(e) => setField("overflowCap", e.target.value)} />
              <span className="input-suffix">USD</span>
            </div>
            <div className="small-note">
              Leave blank for an uncapped raise. If set, demand above the cap is scaled down{" "}
              <strong>pro rata</strong> across every
              depositor, so nobody is front run and the valuation stays where you want it.
            </div>
          </div>
        </div>
        <div className="form-row cols-2">
          <div className="field">
            <label className="field-label">Forego Surplus Escrow</label>
            <div className="range-with-value">
              <input type="range" min={0} max={100} value={state.overflowForego} step={10}
                onChange={(e) => setField("overflowForego", parseInt(e.target.value))} />
              <span className="alloc-value">
                {overflow ? `${overflow.foregoPct.toFixed(0)}%` : "75%"}
              </span>
            </div>
            <div className="small-note">
              At least <strong>75%</strong> of escrow&apos;s <strong>surplus</strong>{" "}
              (above-target funds only, never its target funding) is redirected into the
              treasury. You can forego more, never less.
            </div>
          </div>
          <div className="field">
            <label className="field-label">Redirected escrow goes to</label>
            <div className="small-note">
              The <strong>treasury</strong>, in full.
              Surplus already scales the LP at its base ratio, and cash parked in an LP can
              be drained by arbitrage, so redirected escrow deepens the treasury instead.
              Backing rises, the listing price does not move.
            </div>
          </div>
        </div>
        <div className="overflow-projection-box">
          Projected {overflow?.basis ?? "at target (grows with demand)"} · Listing price{" "}
          <strong>{overflow?.listPrice ?? "—"}</strong>
          {" "}· Backing per token <strong>{overflow?.backing ?? "—"}</strong>
          {" "}· Final market cap <strong>{overflow?.mcp ?? "—"}</strong>
        </div>
      </div>
    );
  }

  return null;
}
