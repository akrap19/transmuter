"use client";

import type { ReactNode } from "react";
import { getAllocationTotal } from "@/lib/launchpad/allocation-sync";
import { formatMcap } from "@/lib/launchpad/launch-solver";
import { VESTING_PRESETS } from "@/lib/launchpad/types";
import { DerivedPriceNote } from "../derived-price-note";
import { useLaunchpad } from "../launchpad-context";
import { PublicFundBox } from "../public-fund-box";
import { AllocationSection } from "./allocation-section";
import { SaleTypeExtras } from "./sale-type-extras";

const SALE_NOTES = {
  fixed: (
    <>
      One known price, one known valuation. Buyers deposit{" "}
      <strong style={{ color: "var(--tm-gold)" }}>USDC</strong>; deposits stay{" "}
      <strong style={{ color: "var(--tm-green)" }}>withdrawable</strong> until finalization.
      Best when you want a predictable raise.
    </>
  ),
  dutch:
    "Price opens high and decays toward your floor, and buyers clear at whatever price the market meets. That starves snipers of a fixed cheap entry and lets real demand set the clearing price.",
  overflow:
    "One uniform price for everyone, set by the demand that actually shows up. Price is an output here, not an input: the final price is the total raised divided by the tokens sold. The deepest liquidity and treasury of the three types, with a mandatory 24 hour window that closes deposits before withdrawals to stop a last minute whale.",
} as const;

export function TokenomicsStep() {
  const { state, goToStep, dispatch, launchSolve } = useLaunchpad();
  const total = getAllocationTotal({
    allocLP: state.allocLP,
    allocTeam: state.allocTeam,
    allocPublic: state.allocPublic,
    allocInvestors: state.allocInvestors,
    showInvestors: state.showInvestors,
    daoAirdropPct: state.daoAirdropPct,
    daoAirdrop: state.toggles.daoAirdrop,
  });
  const mcap = launchSolve?.price && launchSolve.supply ? launchSolve.price * launchSolve.supply : null;

  return (
    <div className={`step-panel panel${state.currentStep === 2 ? " active" : ""}`}>
      <div className="panel-title"><div className="dot" />Tokenomics</div>
      <div className="form-row tokenomics-grid">
        <div className="tokenomics-left">
          <SupplyFields dispatch={dispatch} />
        </div>
        <div className="field">
          <label className="field-label">Launch Outcome</label>
          <DerivedPriceNote variant="outcome" />
        </div>
      </div>
      <SaleTypeFields note={SALE_NOTES[state.saleType]} />
      <SaleTypeExtras />
      <div className="small-note" style={{ marginBottom: 20 }}>
        Implied Market Cap (MCP):{" "}
        <strong style={{ color: "var(--tm-cyan)" }}>{mcap ? `$${formatMcap(mcap)}` : "-"}</strong>
        {" "}&nbsp;·&nbsp; USD shown for sizing; the sale itself is denominated in your backing cToken.
      </div>
      <hr className="section-divider" />
      <AllocationSection total={total} />
      <PublicFundBox />
      <VestingBlock />
      <div className="btn-row">
        <button type="button" className="btn btn-outline" onClick={() => goToStep(1)}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={() => goToStep(3)}>Next: Backing →</button>
      </div>
    </div>
  );
}

function SupplyFields({ dispatch }: { dispatch: ReturnType<typeof useLaunchpad>["dispatch"] }) {
  const { state, setField } = useLaunchpad();
  return (
    <>
      <div className="field">
        <label className="field-label">Initial Token Supply <span className="badge required">Required</span></label>
        <div className="input-wrap">
          <input type="number" placeholder="100000000" min={1} value={state.tokenSupply}
            onChange={(e) => dispatch({ type: "ON_ESCROW_INPUT", tokenSupply: e.target.value })} />
          <span className="input-suffix">tokens</span>
        </div>
      </div>
      <div className="field">
        <label className="field-label">Target Escrow Raise</label>
        <div className="input-wrap">
          <input type="number" step={1000} min={0} value={state.escrowNeed}
            onChange={(e) => dispatch({ type: "ON_ESCROW_INPUT", escrowNeed: e.target.value })} />
          <span className="input-suffix">USD</span>
        </div>
        <div className="small-note">
          What the team needs to build. Set <strong>0</strong> if you are not raising for
          development, the whole raise then goes to backing.
        </div>
      </div>
      <div className="field">
        <label className="field-label raise-label">
          <span>Total Target Raise <span className="badge required">Required</span></span>
          <button
            type="button"
            className="btn-min-raise"
            title="Overwrite the raise with the smallest amount that funds escrow, pairs the LP, and puts the treasury on its 10% ask."
            onClick={() => dispatch({ type: "USE_MINIMUM_RAISE" })}
          >
            Use minimum
          </button>
        </label>
        <div className="input-wrap">
          <input type="number" step={1000} min={0} value={state.targetRaise} onChange={(e) => setField("targetRaise", e.target.value)} />
          <span className="input-suffix">USD</span>
        </div>
        <DerivedPriceNote variant="hint" />
        {state.saleType === "overflow" && (
          <div className="small-note overflow-floor-note">
            This is the overflow floor: it funds escrow, pairs the liquidity in full, and
            puts the treasury on its 10% ask. If the pool raises less, the wizard will not
            size a launch; on-chain the sale voids only if projected treasury is below 8%
            of MCP after pairing, or combined backing is below 18%. Anything above the ask
            is surplus.
          </div>
        )}
      </div>
    </>
  );
}

function SaleTypeFields({ note }: { note: ReactNode }) {
  const { state, setField } = useLaunchpad();
  return (
    <>
      <div className="form-row cols-2">
        <div className="field">
          <label className="field-label">Sale Window <span className="badge required">Required</span></label>
          <div className="input-wrap">
            <select value={state.saleWindow} onChange={(e) => setField("saleWindow", e.target.value)}>
              {["2 days", "1 week", "2 weeks", "1 month", "60 days"].map((v) => (
                <option key={v} value={v === "60 days" ? "60 days" : v}>{v === "60 days" ? "60 days (max)" : v}</option>
              ))}
            </select>
          </div>
          <div className="small-note">
            Fixed price, Dutch auction, or overflow pool. Ends on sellout, funding target, or
            window close.
          </div>
        </div>
        <div className="field">
          <label className="field-label">Sale Type <span className="badge required">Required</span></label>
          <div className="input-wrap">
            <select value={state.saleType} onChange={(e) => setField("saleType", e.target.value as typeof state.saleType)}>
              <option value="fixed">Fixed price · certainty</option>
              <option value="dutch">Reverse Dutch · price discovery</option>
              <option value="overflow">Overflow pool · demand led depth</option>
            </select>
          </div>
          <div className="small-note">{note}</div>
        </div>
      </div>
    </>
  );
}

function VestingBlock() {
  const { state, dispatch } = useLaunchpad();
  return (
    <>
      <div className="panel-title vesting-title"><div className="dot dot-pink" />Vesting Schedule</div>
      <div className="vesting-presets">
        {VESTING_PRESETS.map((p) => (
          <button key={p.value} type="button" className={`vesting-preset${state.vesting === p.value ? " selected" : ""}`}
            onClick={() => dispatch({ type: "SET_VESTING", vesting: p.value })}>
            <div className="vesting-preset-name">{p.label}</div>
            <div className="vesting-preset-sub">{p.sub}</div>
          </button>
        ))}
      </div>
      <p className="small-note vesting-note">
        Vesting applies to the <strong style={{ color: "var(--tm-gold)" }}>Team</strong> and{" "}
        <strong style={{ color: "#BCA9E0" }}>Investor</strong> allocations. Vesting clocks
        start at sale finalization, not at deployment.
      </p>
      <hr className="section-divider" />
    </>
  );
}
