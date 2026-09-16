"use client";

import type { ReactNode } from "react";
import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE, feeSegmentPct } from "@/lib/launchpad/fee-calculator";
import type { FeeChangeSource } from "@/lib/launchpad/fee-calculator";
import { ToggleRow } from "../shared-form";
import { useLaunchpad } from "../launchpad-context";

export function FeesStep() {
  const { state, goToStep, updateFees } = useLaunchpad();
  const { fees, selectedCToken } = state;

  return (
    <div className={`step-panel panel${state.currentStep === 4 ? " active" : ""}`}>
      <div className="panel-title"><div className="dot" />Transaction Fee Configuration</div>
      <p className="step-intro">
        Set the total transfer fee and how it splits.{" "}
        <strong style={{ color: "var(--tm-gold)" }}>
          Protocol Revenue (0.15%) and cToken reserve contribution (0.05%) are fixed by the protocol
        </strong>{" "}
        — a combined fixed minimum of 0.20%. You control how the rest splits between LP
        and Treasury, each with a{" "}
        <strong style={{ color: "var(--tm-cyan)" }}>minimum of 0.10%</strong>. Redeeming
        carries a fee that tracks this transfer fee, so exiting by redemption is never
        cheaper than selling; its protocol share funds the protocol and the remainder
        stays in the treasury for remaining holders.
      </p>

      <div className="panel-title fee-split-title">
        <div className="dot dot-gold" />
        Fee Destination Split
      </div>

      <RangeField
        label="Total TX Fee"
        value={fees.totalFee}
        max={2}
        min={0.4}
        step={0.05}
        onChange={(v) => updateFees(undefined, v)}
        note="Max 2.00% · Min 0.40% (0.15 protocol + 0.05 cToken reserve + 0.10 LP + 0.10 treasury) · Recommended: 0.5% – 1.0%"
      />

      <FixedFee
        label={
          <>
            🔒 Protocol Revenue{" "}
            <span className="fee-fixed-badge">FIXED</span>
          </>
        }
        value={PROTOCOL_FEE}
        pink
        note="Fixed 0.15% — funds protocol development and operations."
      />

      <FixedFee
        label={
          <>
            🔒 cToken reserve contribution{" "}
            <span className="fee-ctoken-badge">({selectedCToken.name})</span>{" "}
            <span className="fee-fixed-badge">FIXED</span>
          </>
        }
        value={CTOKEN_RESERVE_FEE}
        green
        note="Fixed 0.05% — swapped into the backing cToken reserve at settlement. A NonTransferable cToken has no market, so this is not a buyback."
      />

      <AdjustableFee
        label={
          <>
            🌊 Liquidity Pool Allocation{" "}
            <span className="fee-min-badge">(min 0.10%)</span>
          </>
        }
        value={fees.lpFee}
        max={fees.lpMax}
        changed="lp"
        note="Added to the LP on every transaction to grow trading depth and price stability. Minimum 0.10%."
      />
      <AdjustableFee
        label={
          <>
            🏛️ Treasury (Backing) Allocation{" "}
            <span className="fee-min-badge">(min 0.10%)</span>
          </>
        }
        value={fees.treasuryFee}
        max={fees.treasuryMax}
        changed="treasury"
        gold
        note="Swapped into your backing cToken at settlement and held as treasury. Minimum 0.10%."
        warning={fees.feeWarning ? (
          <div id="treasuryFeeWarning" className="fee-budget-warning">
            ⚠️ Allocations exceed the total transfer fee budget. The slider you last moved
            was capped to fit; raise Total TX Fee to allocate more.
          </div>
        ) : null}
      />

      <BurnFeeSection />
      <CreatorFeeSection />
      <FeeBreakdownVisual />

      <div className="btn-row">
        <button type="button" className="btn btn-outline" onClick={() => goToStep(3)}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={() => goToStep(5)}>Next: Review →</button>
      </div>
    </div>
  );
}

function FixedFee({
  label,
  value,
  green,
  pink,
  note,
}: {
  label: ReactNode;
  value: number;
  green?: boolean;
  pink?: boolean;
  note?: string;
}) {
  return (
    <RangeField
      label={label}
      value={value}
      max={value}
      min={value}
      step={0.01}
      disabled
      green={green}
      pink={pink}
      note={note}
    />
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  gold,
  green,
  pink,
  note,
  warning,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange?: (v: number) => void;
  gold?: boolean;
  green?: boolean;
  pink?: boolean;
  note?: string;
  warning?: ReactNode;
}) {
  const valueClass = gold ? " gold" : green ? " green" : pink ? " pink" : "";
  return (
    <div className="slider-section" style={disabled ? { opacity: 0.6 } : undefined}>
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className={`slider-value${valueClass}`}>{value.toFixed(2)}%</span>
      </div>
      <input
        type="range"
        className={gold ? "gold" : green ? "green" : pink ? "pink" : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
      />
      {note && <div className="small-note" style={{ marginTop: 8 }}>{note}</div>}
      {warning}
    </div>
  );
}

function AdjustableFee({
  label,
  value,
  max,
  changed,
  gold,
  note,
  warning,
}: {
  label: ReactNode;
  value: number;
  max: number;
  changed: FeeChangeSource;
  gold?: boolean;
  note?: string;
  warning?: ReactNode;
}) {
  const { updateFees } = useLaunchpad();
  const key = changed === "lp" ? "lpFee" : "treasuryFee";

  return (
    <RangeField
      label={label}
      value={value}
      min={0.1}
      max={max}
      step={0.05}
      gold={gold}
      note={note}
      warning={warning}
      onChange={(v) => updateFees(changed, undefined, { [key]: v })}
    />
  );
}

function BurnFeeSection() {
  const { state, updateFees } = useLaunchpad();
  return (
    <div className="slider-section">
      <ToggleRow
        toggleKey="burnFee"
        name="🔥 Optional Burn Allocation (Optional)"
        desc="Burns your token's own supply on every transfer. Part of the total fee, not an extra charge. When on: 0.05% to 1%."
      />
      {state.toggles.burnFee && (
        <RangeField
          label="🔥 Burn Allocation"
          value={state.fees.burnFee}
          min={0.05}
          max={state.fees.burnMax}
          step={0.05}
          note="Deflationary by choice. Drawn from the same total fee budget as LP and treasury."
          onChange={(v) => updateFees("burn", undefined, { burnFee: v })}
        />
      )}
    </div>
  );
}

function CreatorFeeSection() {
  const { state, updateFees } = useLaunchpad();
  return (
    <div className="slider-section">
      <ToggleRow
        toggleKey="creatorFee"
        name="💰 Optional Creator Fee (Optional)"
        desc="Pays you a share of every trade, the same way the protocol takes its cut. Part of the total fee, not an extra charge. When on: up to 0.5%, shown to buyers at launch."
      />
      {state.toggles.creatorFee && (
        <RangeField
          label="💰 Creator Fee"
          value={state.fees.creatorFee}
          min={0}
          max={state.fees.creatorMax}
          step={0.05}
          note="Your royalty on your token's volume. Drawn from the same total fee budget as LP and treasury, so taking it directs less to backing."
          onChange={(v) => updateFees("creator", undefined, { creatorFee: v })}
        />
      )}
    </div>
  );
}

function FeeBreakdownVisual() {
  const { state } = useLaunchpad();
  const { fees } = state;
  const items = [
    { short: "LP", label: "Liquidity Pool", pct: fees.lpFee, color: "rgba(240,194,75,0.8)" },
    { short: "TREASURY", label: "Treasury Acquisition", pct: fees.treasuryFee, color: "rgba(240,194,75,0.8)" },
    { short: "PROTOCOL", label: "Protocol Revenue", pct: PROTOCOL_FEE, color: "rgba(224,138,78,0.8)" },
    { short: "RESERVE", label: "cToken reserve", pct: CTOKEN_RESERVE_FEE, color: "rgba(229,199,107,0.8)" },
    { short: "BURN", label: "Burn (optional)", pct: state.toggles.burnFee ? fees.burnFee : 0, color: "rgba(188,169,224,0.85)" },
    { short: "CREATOR", label: "Creator (optional)", pct: state.toggles.creatorFee ? fees.creatorFee : 0, color: "rgba(120,200,220,0.85)" },
  ];

  return (
    <div className="fee-breakdown">
      <div className="fee-breakdown-title">Live Fee Breakdown - per 100 tokens traded</div>
      <div className="fee-bar">
        {items.filter((i) => i.pct > 0).map((i) => (
          <div
            key={i.label}
            className="fee-bar-seg"
            style={{ width: `${feeSegmentPct(i.pct, fees.totalFee)}%`, background: i.color }}
          >
            {i.short}
          </div>
        ))}
      </div>
      <div className="fee-legend">
        {items.map((i) => (
          <div key={i.label} className="fee-legend-item">
            <div className="fee-legend-dot" style={{ background: i.color }} />
            <span>{i.label}</span>
            <span className="fee-legend-pct">{i.pct > 0 ? `${i.pct.toFixed(2)}%` : "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
