"use client";

import { LP_ALLOC_MIN } from "@/lib/launchpad/floors";
import { useLaunchpad } from "../launchpad-context";

export function AllocationSection({ total }: { total: number }) {
  const { state, setField, syncAlloc } = useLaunchpad();
  const dao = state.toggles.daoAirdrop ? state.daoAirdropPct : 0;
  const investors = state.showInvestors ? state.allocInvestors : 0;
  const totalColor =
    Math.abs(total - 100) < 0.05 ? "var(--tm-green)" : total > 100 ? "var(--tm-pink)" : "var(--tm-gold)";

  return (
    <>
      <div className="panel-title alloc-title">
        <div className="dot dot-gold" />
        Supply Allocation
      </div>
      <p className="small-note" style={{ marginBottom: 16 }}>
        Allocate your initial token supply across different pools. Total must equal 100%.
      </p>
      <div className="alloc-section">
        <AllocSlider keyName="allocLP" label="🌊 Liquidity Pool" color="var(--tm-cyan)" min={LP_ALLOC_MIN} max={45} changed="lp" />
        <AllocSlider
          keyName="allocTeam"
          label={
            <>
              🏦 Team <span className="alloc-vested">VESTED</span>
            </>
          }
          color="var(--tm-gold)"
          min={0}
          max={20}
          changed="team"
        />
        {state.showInvestors && (
          <AllocSlider
            keyName="allocInvestors"
            label={
              <>
                💼 Investors <span className="alloc-vested alloc-vested-investor">VESTED</span>
              </>
            }
            color="#BCA9E0"
            min={0}
            max={20}
            changed="investors"
          />
        )}
        <AllocSlider
          keyName="allocPublic"
          label={
            <>
              🌐 Public Sale / IDO <span className="alloc-min">min 20%</span>
            </>
          }
          color="var(--tm-green)"
          min={20}
          max={90}
          changed="public"
        />
        {state.toggles.daoAirdrop && (
          <div className="alloc-row">
            <span className="alloc-label" style={{ color: "var(--tm-pink)" }}>🏛️ DAO Airdrop</span>
            <div className="alloc-slider-wrap">
              <input type="range" value={dao} disabled style={{ opacity: 0.5 }} />
            </div>
            <span className="alloc-value" style={{ color: "var(--tm-pink)" }}>{dao.toFixed(1)}%</span>
          </div>
        )}
        <label className="investors-check">
          <input type="checkbox" checked={state.showInvestors}
            onChange={(e) => {
              setField("showInvestors", e.target.checked);
              if (!e.target.checked) setField("allocInvestors", 0);
              syncAlloc("investors");
            }} />
          Add investor allocation <span style={{ color: "#BCA9E0" }}>(optional)</span>
        </label>
        <div className="alloc-bar">
          <div className="alloc-bar-seg" style={{ width: `${state.allocLP}%`, background: "var(--tm-cyan)" }} />
          <div className="alloc-bar-seg" style={{ width: `${state.allocTeam}%`, background: "var(--tm-gold)" }} />
          <div className="alloc-bar-seg" style={{ width: `${investors}%`, background: "#BCA9E0" }} />
          <div className="alloc-bar-seg" style={{ width: `${state.allocPublic}%`, background: "var(--tm-green)" }} />
          <div className="alloc-bar-seg" style={{ width: `${dao}%`, background: "var(--tm-pink)" }} />
        </div>
        <div className="alloc-total" style={{ color: totalColor }}>Total: {total.toFixed(1)}%</div>
      </div>
      <hr className="section-divider" />
    </>
  );
}

function AllocSlider({
  keyName,
  label,
  color,
  min,
  max,
  changed,
}: {
  keyName: "allocLP" | "allocTeam" | "allocPublic" | "allocInvestors";
  label: React.ReactNode;
  color: string;
  min: number;
  max: number;
  changed: "lp" | "team" | "public" | "investors";
}) {
  const { state, setField, syncAlloc } = useLaunchpad();
  return (
    <div className="alloc-row">
      <span className="alloc-label" style={{ color }}>{label}</span>
      <div className="alloc-slider-wrap">
        <input type="range" min={min} max={max} value={state[keyName]}
          onChange={(e) => { setField(keyName, parseInt(e.target.value)); syncAlloc(changed); }} />
      </div>
      <span className="alloc-value" style={{ color }}>{state[keyName]}%</span>
    </div>
  );
}
