"use client";

import { CTOKENS } from "@/lib/launchpad/types";
import { useLaunchpad } from "../launchpad-context";

export function BackingStep() {
  const { state, setField, goToStep, dispatch } = useLaunchpad();
  const { selectedCToken, autoMintTrigger, autoMintDeactivate, voteWindow } = state;

  return (
    <div className={`step-panel panel${state.currentStep === 3 ? " active" : ""}`}>
      <div className="panel-title"><div className="dot" />cToken Backing</div>
      <p className="step-intro">
        Select the cToken that backs your treasury. cTokens are deflationary wrappers of
        blue-chip assets: every trade burns supply, so backing per token only grows, and
        each holds its own isolated gold reserve as a last resort. Your token inherits
        that full chain.
      </p>

      <div className="ctoken-grid">
        {CTOKENS.map((c) => (
          <button
            key={c.name}
            type="button"
            className={`ctoken-card${selectedCToken.name === c.name ? " selected" : ""}`}
            onClick={() => dispatch({ type: "SELECT_CTOKEN", cToken: c })}
          >
            <div className="ctoken-icon">{c.icon}</div>
            <div className="ctoken-name">{c.name}</div>
            <div className="ctoken-base">{c.base}</div>
            <div className="ctoken-eol">→ isolated gold reserve</div>
          </button>
        ))}
      </div>

      <div className="eol-box">
        <div className="eol-icon">🏆</div>
        <div className="eol-box-text">
          Every trade strengthens the chain beneath you: a fee portion market-buys and burns{" "}
          <strong>{selectedCToken.name}</strong>, whose own isolated{" "}
          <strong style={{ color: "var(--tm-gold)" }}>tokenized gold reserve</strong> grows
          with every transaction. Your holders inherit this protection at no extra cost.
        </div>
      </div>

      <hr className="section-divider" />
      <div className="panel-title reserve-title"><div className="dot dot-gold" />Reserve Mint</div>

      <p className="step-intro reserve-intro">
        If the value of your treasury falls below the activate threshold you set here,
        continuously for 6 hours, a reserve mint event opens <em>automatically</em>: up to{" "}
        <strong style={{ color: "var(--tm-gold)" }}>15% of supply</strong> becomes mintable
        at market price plus a descending premium (opening near 20%, easing toward 3%),
        refilling the treasury above market. No vote required, no creator involvement,
        manipulation-resistant by design.
      </p>

      <SliderBlock
        label="Reserve Mint Activate Threshold (% backing)"
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
        label="Reserve Mint Deactivate Threshold (% backing)"
        value={autoMintDeactivate}
        display={`${autoMintDeactivate}%`}
        min={20}
        max={35}
        step={1}
        className="gold"
        onChange={(v) => setField("autoMintDeactivate", v)}
        hints={["20% - Closes sooner", "35% - Closes later"]}
      />

      <div className="auto-mint-info">
        <strong style={{ color: "var(--tm-gold)" }}>
          Hysteresis band {autoMintTrigger}% / {autoMintDeactivate}%:
        </strong>{" "}
        a reserve mint event opens automatically if backing stays below {autoMintTrigger}%
        of market cap continuously for 6 hours, and closes once backing recovers to{" "}
        {autoMintDeactivate}%. The two thresholds stay at least 10 points apart so the
        event cannot flicker open and closed. While open, up to 15% of supply (snapshotted
        at open) is mintable at market price plus a descending premium (near 20%, easing
        to 3%), paid into the treasury above market, minus a 0.3% protocol fee. You cannot
        influence or block this.
      </div>

      <hr className="section-divider" />
      <SliderBlock
        label="Governance Mint Vote Window"
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

      <div className="reserve-limits">
        <strong style={{ color: "var(--tm-gold)" }}>Hard limits, enforced on-chain:</strong>{" "}
        max 3 automatic events per rolling year (60 days apart) · max 3 governance events
        per rolling year · nothing opens while backing is at or above 50% · only one event
        open at a time · every mint prices above market and feeds the treasury.
      </div>

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
        <span className="slider-label">{label}</span>
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
      {note && <div className="small-note" style={{ marginTop: 8 }}>{note}</div>}
    </div>
  );
}
