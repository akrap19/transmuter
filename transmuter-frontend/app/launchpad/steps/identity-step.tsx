"use client";

import { LogoUpload } from "../shared-form";
import { useLaunchpad } from "../launchpad-context";

export function IdentityStep() {
  const { state, setField, goToStep } = useLaunchpad();

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

      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={() => goToStep(2)}>
          Next: Tokenomics →
        </button>
      </div>
    </div>
  );
}
