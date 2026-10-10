"use client";

import { FieldHint } from "../field-hint";
import { useLaunchpad } from "../launchpad-context";
import { BackingBasket } from "./backing-basket-section";

export function BackingStep() {
  const { state, setField, goToStep } = useLaunchpad();
  const { autoMintTrigger, autoMintDeactivate, voteWindow } = state;

  return (
    <div className={`step-panel panel${state.currentStep === 3 ? " active" : ""}`}>
      <div className="panel-title">
        <div className="dot" />
        Treasury backing basket
        <FieldHint label="About the backing basket">
          Choose which reserve assets back your treasury and how the backing splits across them.
          Each share is set on its own, and the total must be 100%. SOL and BTC settle into live
          cToken reserves. Gold and S&amp;P each have one fee address; their share of the reserve
          fee is sent there.
        </FieldHint>
      </div>

      <BackingBasket />

      <div className="section-title">
        <div className="dot" />
        Mint to scale
        <FieldHint label="About mint to scale">
          <span>
            If the value of your treasury falls below the activate threshold you set here,
            continuously for 6 hours, a Mint to Scale event opens <em>automatically</em>: up to{" "}
            <strong>15% of supply</strong> becomes mintable
            at market price plus a descending premium (opening near 20%, easing toward 3%),
            refilling the treasury above market. No vote required, no creator involvement,
            manipulation-resistant by design.
          </span>
          <span>
            <strong>
              Hysteresis band {autoMintTrigger}% / {autoMintDeactivate}%:
            </strong>{" "}
            a Mint to Scale event opens automatically if backing stays below {autoMintTrigger}%
            of market cap continuously for 6 hours, and closes once backing recovers to{" "}
            {autoMintDeactivate}%. The two thresholds stay at least 10 points apart so the
            event cannot flicker open and closed. While open, up to 15% of supply (snapshotted
            at open) is mintable at market price plus a descending premium (near 20%, easing
            to 3%), paid into the treasury above market, minus a 0.3% protocol fee. You cannot
            influence or block this.
          </span>
        </FieldHint>
      </div>

      <SliderBlock
        label="Mint to Scale activate threshold (% backing)"
        value={autoMintTrigger}
        display={`${autoMintTrigger}%`}
        min={5}
        max={17}
        step={1}
        className="gold"
        onChange={(v) => setField("autoMintTrigger", v)}
        hints={["5% - Opens later", "17% - Opens sooner"]}
      />
      <SliderBlock
        label="Mint to Scale deactivate threshold (% backing)"
        value={autoMintDeactivate}
        display={`${autoMintDeactivate}%`}
        min={20}
        max={35}
        step={1}
        className="gold"
        onChange={(v) => setField("autoMintDeactivate", v)}
        hints={["20% - Closes sooner", "35% - Closes later"]}
      />

      <div className="section-title">
        <div className="dot" />
        Governance
        <FieldHint label="About governance limits">
          <strong>Hard limits, enforced on-chain:</strong>{" "}
          max 3 automatic events per rolling year (60 days apart) · max 3 governance events
          per rolling year · nothing opens while backing is at or above 50% · only one event
          open at a time · every mint prices above market and feeds the treasury.
        </FieldHint>
      </div>
      <SliderBlock
        label="Governance mint vote window"
        value={voteWindow}
        display={`${voteWindow}h`}
        min={24}
        max={48}
        step={12}
        className="gold"
        onChange={(v) => setField("voteWindow", v)}
        hints={["24h - Faster response", "48h - More time to notice"]}
        note="Ambassadors can also propose a mint (5% to 15% of supply per event); holders approve with 67% staked weight. This sets how long that vote runs."
      />

      <div className="btn-row">
        <button type="button" className="btn btn-outline" onClick={() => goToStep(2)}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={() => goToStep(4)}>Next: Fees →</button>
      </div>
    </div>
  );
}

function SliderBlock({
  label,
  value,
  display,
  min,
  max,
  step,
  className,
  onChange,
  hints,
  note,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  className?: string;
  onChange: (v: number) => void;
  hints: [string, string];
  note?: string;
}) {
  return (
    <div className="slider-section">
      <div className="slider-header">
        <span className="slider-label">
          {label}
          {note ? <FieldHint label={`About ${label}`}>{note}</FieldHint> : null}
        </span>
        <span className={`slider-value${className ? ` ${className}` : ""}`}>{display}</span>
      </div>
      <input
        type="range"
        className={className}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
      <div className="slider-hints">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}
