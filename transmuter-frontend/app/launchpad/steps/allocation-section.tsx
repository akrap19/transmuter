"use client";

import { LP_ALLOC_MIN } from "@/lib/launchpad/floors";
import { FieldHint } from "../field-hint";
import { useLaunchpad } from "../launchpad-context";

export function AllocationSection({ total }: { total: number }) {
  const { state } = useLaunchpad();
  const dao = state.toggles.daoAirdrop ? state.daoAirdropPct : 0;
  const investors = state.showInvestors ? state.allocInvestors : 0;
  const over = total > 100.05;

  return (
    <>
      <div className="section-title">
        <div className="dot" />
        Supply allocation
        <FieldHint label="About supply allocation">
          Allocate your initial token supply across different pools. Total must equal 100%.
        </FieldHint>
      </div>
      <div className="alloc-section">
        <AllocSlider keyName="allocLP" label="Liquidity pool" min={LP_ALLOC_MIN} max={45} changed="lp" />
        <AllocSlider
          keyName="allocTeam"
          label={
            <>
              Team <span className="alloc-vested">Vested</span>
            </>
          }
          min={0}
          max={20}
          changed="team"
        />
        <AllocSlider
          keyName="allocPublic"
          label={
            <>
              Public sale <span className="alloc-min">Min 20%</span>
            </>
          }
          min={20}
          max={90}
          changed="public"
        />
        {state.toggles.daoAirdrop && (
          <div className="alloc-row">
            <span className="alloc-label">DAO airdrop</span>
            <div className="alloc-slider-wrap">
              <input type="range" value={dao} disabled />
            </div>
            <span className="alloc-value">{dao.toFixed(1)}%</span>
          </div>
        )}
        <label className="investors-check is-disabled">
          <input type="checkbox" checked={false} disabled />
          Add investor allocation
          <span className="fee-min-badge">Unavailable</span>
        </label>
        <div className="alloc-summary">
          <span className="field-label">Split</span>
          <div className="alloc-bar">
            <div className="alloc-bar-seg" style={{ width: `${state.allocLP}%` }} />
            <div className="alloc-bar-seg" style={{ width: `${state.allocTeam}%` }} />
            <div className="alloc-bar-seg" style={{ width: `${investors}%` }} />
            <div className="alloc-bar-seg" style={{ width: `${state.allocPublic}%` }} />
            <div className="alloc-bar-seg" style={{ width: `${dao}%` }} />
          </div>
          <div className={`alloc-total${over ? " over" : ""}`}>Total {total.toFixed(1)}%</div>
        </div>
      </div>
    </>
  );
}

function AllocSlider({
  keyName,
  label,
  min,
  max,
  changed,
}: {
  keyName: "allocLP" | "allocTeam" | "allocPublic" | "allocInvestors";
  label: React.ReactNode;
  min: number;
  max: number;
  changed: "lp" | "team" | "public" | "investors";
}) {
  const { state, setField, syncAlloc } = useLaunchpad();
  return (
    <div className="alloc-row">
      <span className="alloc-label">{label}</span>
      <div className="alloc-slider-wrap">
        <input type="range" min={min} max={max} value={state[keyName]}
          onChange={(e) => { setField(keyName, parseInt(e.target.value)); syncAlloc(changed); }} />
      </div>
      <span className="alloc-value">{state[keyName]}%</span>
    </div>
  );
}
