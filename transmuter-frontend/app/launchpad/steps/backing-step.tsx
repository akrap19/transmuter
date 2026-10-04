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
        Select the cToken that backs your treasury. Backing per token, counted in the base asset, only grows.
      </p>

      <div className="ctoken-grid">
        {CTOKENS.map((c) => (
          <button
            key={c.name}
            type="button"
            className={`ctoken-card${selectedCToken.name === c.name ? " selected" : ""}`}
            onClick={() => dispatch({ type: "SELECT_CTOKEN", cToken: c })}
          >
            <div className="ctoken-icon">
              {c.name === "cSOL" ? <SolanaMark /> : c.icon}
            </div>
            <div className="ctoken-name">{c.name}</div>
            <div className="ctoken-base">{c.base}</div>
          </button>
        ))}
      </div>

      <div className="section-title"><div className="dot" />Mint to scale</div>

      <p className="step-intro reserve-intro">
        If the value of your treasury falls below the activate threshold you set here,
        continuously for 6 hours, a Mint to Scale event opens <em>automatically</em>: up to{" "}
        <strong>15% of supply</strong> becomes mintable
        at market price plus a descending premium (opening near 20%, easing toward 3%),
        refilling the treasury above market. No vote required, no creator involvement,
        manipulation-resistant by design.
      </p>

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

      <div className="auto-mint-info">
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
      </div>

      <div className="section-title"><div className="dot" />Governance</div>
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

      <div className="reserve-limits">
        <strong>Hard limits, enforced on-chain:</strong>{" "}
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

function SolanaMark() {
  return (
    <svg className="solana-mark" viewBox="0 0 398 312" aria-hidden="true">
      <defs>
        <linearGradient id="csol-solana" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#7961F2" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <g fill="url(#csol-solana)">
        <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
        <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
        <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
      </g>
    </svg>
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
      {note && <div className="small-note">{note}</div>}
    </div>
  );
}
