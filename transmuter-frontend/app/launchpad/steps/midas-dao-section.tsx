"use client";

import { ToggleRow } from "../shared-form";
import { useLaunchpad } from "../launchpad-context";

export function MidasDaoSection() {
  const { state, setField, syncAlloc } = useLaunchpad();

  function onDaoPctChange(value: string) {
    const pct = Math.min(10, parseFloat(value) || 0);
    setField("daoAirdropPct", pct);
    syncAlloc("dao");
  }

  return (
    <>
      <div className="panel-title" style={{ marginBottom: 14 }}>
        <div className="dot" style={{ background: "var(--tm-gold)", boxShadow: "0 0 8px var(--tm-gold)" }} />
        MIDAS DAO Integration
      </div>
      <ToggleRow
        toggleKey="daoAirdrop"
        name="Opt into MIDAS DAO Airdrop Programme"
        desc="Deposit a token allocation to get airdropped to all MIDAS DAO holders. Free visibility across the ecosystem."
      />
      {state.toggles.daoAirdrop && (
        <div style={{ marginTop: 4, marginBottom: 12 }}>
          <div className="field">
            <label className="field-label">
              % of Supply for DAO Airdrop <span className="badge">Opt-in</span>
            </label>
            <div className="input-wrap">
              <input
                type="number"
                value={state.daoAirdropPct}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(event) => onDaoPctChange(event.target.value)}
              />
              <span className="input-suffix">%</span>
            </div>
            <div className="small-note">
              Deposited to the DAO pool and paid proportionally to MIDAS token stakers. This value carries over
              automatically to your supply allocation.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
