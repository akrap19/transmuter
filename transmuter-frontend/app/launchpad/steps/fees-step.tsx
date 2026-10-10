"use client";

import type { ReactNode } from "react";
import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE, PUBLISHED_MIN_TOTAL_FEE, feeSegmentPct } from "@/lib/launchpad/fee-calculator";
import type { FeeChangeSource } from "@/lib/launchpad/fee-calculator";
import { FieldHint } from "../field-hint";
import { ToggleRow } from "../shared-form";
import { useLaunchpad } from "../launchpad-context";

export function FeesStep() {
  const { state, goToStep, updateFees } = useLaunchpad();
  const { fees } = state;

  return (
    <div className={`step-panel panel${state.currentStep === 4 ? " active" : ""}`}>
      <div className="panel-title">
        <div className="dot" />
        Transaction Fee Configuration
        <FieldHint label="About transaction fees">
          Set the total transfer fee and how it splits. Protocol revenue ({PROTOCOL_FEE.toFixed(2)}%) and
          the reserve contribution ({CTOKEN_RESERVE_FEE.toFixed(2)}%) are fixed — a combined
          minimum of {(PROTOCOL_FEE + CTOKEN_RESERVE_FEE).toFixed(2)}%. You choose how the rest splits
          between the liquidity pool and the treasury, each at least 0.10%. Redeeming tracks this same
          fee, so exiting is never cheaper than selling.
        </FieldHint>
      </div>

      <RangeField
        label="Total TX Fee"
        value={fees.totalFee}
        max={2}
        min={PUBLISHED_MIN_TOTAL_FEE}
        step={0.05}
        onChange={(v) => updateFees(undefined, v)}
        note={`0.50% to 2.00%. 0.60% is the recommended default. Protocol ${PROTOCOL_FEE.toFixed(2)}% and reserve ${CTOKEN_RESERVE_FEE.toFixed(2)}% are fixed. LP and treasury are at least 0.10% each.`}
        warning={fees.totalFee > 1 ? (
          <div className="fee-budget-warning">
            A total fee over 1% is not recommended, unless you know what you&apos;re doing.
          </div>
        ) : null}
      />

      <FixedFee
        label={
          <>
            Protocol revenue <span className="fee-fixed-badge">Fixed</span>
          </>
        }
        value={PROTOCOL_FEE}
        pink
        note="Fixed 0.15% — funds protocol development and operations."
      />

      <FixedFee
        label={
          <>
            Reserve <span className="fee-fixed-badge">Fixed</span>
          </>
        }
        value={CTOKEN_RESERVE_FEE}
        green
        note={`Fixed ${CTOKEN_RESERVE_FEE.toFixed(2)}%. SOL and BTC stay in the cToken reserve. The Gold and S&P shares of this fee go to their fee addresses.`}
      />

      <AdjustableFee
        label={
          <>
            Liquidity pool <span className="fee-min-badge">Min 0.10%</span>
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
            Treasury <span className="fee-min-badge">Min 0.10%</span>
          </>
        }
        value={fees.treasuryFee}
        max={fees.treasuryMax}
        changed="treasury"
        gold
        note="Swapped into your backing reserve at settlement and held as treasury. Minimum 0.10%."
        warning={fees.feeWarning ? (
          <div id="treasuryFeeWarning" className="fee-budget-warning">
            {fees.feeGap > 0
              ? `${fees.feeGap.toFixed(2)}% of the total fee is not allocated. Liquidity pool, treasury, and any optional fees have to use the whole total.`
              : `The split is ${Math.abs(fees.feeGap).toFixed(2)}% above the total fee. Lower a destination or raise the total fee.`}
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
    <div className={`slider-section${disabled ? " is-fixed" : ""}`}>
      <div className="slider-header">
        <span className="slider-label">
          {label}
          {note ? <FieldHint label="About this fee">{note}</FieldHint> : null}
        </span>
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
    <div className="option-block">
      <ToggleRow
        toggleKey="burnFee"
        name="Burn allocation"
        desc="Burns your token's own supply on every transfer. Part of the total fee, not an extra charge. When on: 0.05% to 1%."
      />
      {state.toggles.burnFee && (
        <RangeField
          label="Burn allocation"
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
    <div className="option-block">
      <ToggleRow
        toggleKey="creatorFee"
        name="Creator fee"
        desc="Pays you a share of every trade, the same way the protocol takes its cut. Part of the total fee, not an extra charge. When on: up to 0.5%, shown to buyers at launch."
      />
      {state.toggles.creatorFee && (
        <RangeField
          label="Creator fee"
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
    { short: "LP", label: "Liquidity pool", pct: fees.lpFee, color: "rgba(255, 216, 127, 0.95)" },
    { short: "TREASURY", label: "Treasury", pct: fees.treasuryFee, color: "rgba(234, 179, 84, 0.9)" },
    { short: "PROTOCOL", label: "Protocol revenue", pct: PROTOCOL_FEE, color: "rgba(201, 146, 58, 0.95)" },
    { short: "RESERVE", label: "Reserve", pct: CTOKEN_RESERVE_FEE, color: "rgba(243, 214, 154, 0.8)" },
    { short: "BURN", label: "Burn", pct: state.toggles.burnFee ? fees.burnFee : 0, color: "rgba(255, 255, 255, 0.45)" },
    { short: "CREATOR", label: "Creator", pct: state.toggles.creatorFee ? fees.creatorFee : 0, color: "rgba(229, 182, 84, 0.4)" },
  ];

  return (
    <div className="fee-breakdown">
      <div className="fee-breakdown-title">Fee breakdown</div>
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
