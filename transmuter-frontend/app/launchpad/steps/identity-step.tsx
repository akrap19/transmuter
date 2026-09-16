"use client";

import { ToggleRow, LogoUpload } from "../shared-form";
import { useLaunchpad } from "../launchpad-context";

export function IdentityStep() {
  const { state, setField, goToStep, syncAlloc } = useLaunchpad();

  function onDaoPctChange(v: string) {
    const pct = Math.min(10, parseFloat(v) || 0);
    setField("daoAirdropPct", pct);
    syncAlloc("dao");
  }

  return (
    <div className={`step-panel panel${state.currentStep === 1 ? " active" : ""}`}>
      <div className="panel-title">
        <div className="dot" />
        Token Identity
      </div>

      <div className="form-row cols-2">
        <div className="field">
          <label className="field-label">
            Token Name <span className="badge required">Required</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Aero Protocol"
            value={state.tokenName}
            onChange={(e) => setField("tokenName", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">
            Token Ticker <span className="badge required">Required</span>
          </label>
          <div className="input-wrap">
            <input
              type="text"
              placeholder="AERO"
              maxLength={8}
              value={state.tokenTicker}
              onChange={(e) => setField("tokenTicker", e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field-label">Short Description</label>
          <textarea
            placeholder="Describe your project in 1-2 sentences..."
            value={state.tokenDesc}
            onChange={(e) => setField("tokenDesc", e.target.value)}
          />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="field">
          <label className="field-label">Website</label>
          <input
            type="text"
            placeholder="https://yourproject.com"
            value={state.tokenWebsite}
            onChange={(e) => setField("tokenWebsite", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">X / Twitter</label>
          <input
            type="text"
            placeholder="@yourhandle"
            value={state.tokenTwitter}
            onChange={(e) => setField("tokenTwitter", e.target.value)}
          />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="field">
          <label className="field-label">Telegram</label>
          <input
            type="text"
            placeholder="https://t.me/yourchannel"
            value={state.tokenTelegram}
            onChange={(e) => setField("tokenTelegram", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Discord</label>
          <input
            type="text"
            placeholder="https://discord.gg/yourserver"
            value={state.tokenDiscord}
            onChange={(e) => setField("tokenDiscord", e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <LogoUpload />
      </div>

      <hr className="section-divider" />

      <div className="panel-title" style={{ marginBottom: 14 }}>
        <div className="dot" style={{ background: "var(--tm-gold)", boxShadow: "0 0 8px var(--tm-gold)" }} />
        MIDAS DAO Integration
      </div>

      <ToggleRow
        toggleKey="daoAirdrop"
        name="🏛️ Opt into MIDAS DAO Airdrop Programme"
        desc="Deposit a token allocation to get airdropped to all MIDAS DAO holders - free visibility across the entire ecosystem"
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
                onChange={(e) => onDaoPctChange(e.target.value)}
              />
              <span className="input-suffix">%</span>
            </div>
            <div className="small-note">
              Deposited to the DAO pool and distributed proportionally to MIDAS token
              stakers. This value carries over automatically to your supply allocation.
            </div>
          </div>
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={() => goToStep(2)}>
          Next: Tokenomics →
        </button>
      </div>
    </div>
  );
}
