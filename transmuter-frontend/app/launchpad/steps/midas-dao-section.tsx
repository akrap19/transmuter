"use client";

import { FieldHint } from "../field-hint";
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
    <div className="midas-dao">
      <div className="section-title">
        <div className="dot" />
        MIDAS DAO
      </div>
      <ToggleRow
        toggleKey="daoAirdrop"
        name="Opt into MIDAS DAO Airdrop Programme"
        desc="Deposit a token allocation to get airdropped to all MIDAS DAO holders. Free visibility across the ecosystem."
      />
      {state.toggles.daoAirdrop && (
        <div className="form-row">
          <div className="field">
            <label className="field-label">
              % of Supply for DAO Airdrop <span className="badge">Opt-in</span>
              <FieldHint label="About DAO airdrop supply">
                Deposited to the DAO pool and paid proportionally to MIDAS token stakers. This value carries over
                automatically to your supply allocation.
              </FieldHint>
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
          </div>
        </div>
      )}
    </div>
  );
}
