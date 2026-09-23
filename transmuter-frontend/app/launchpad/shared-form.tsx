"use client";

import { useRef } from "react";
import { useLaunchpad } from "./launchpad-context";

export function ToggleRow({
  name,
  desc,
  toggleKey,
}: {
  name: string;
  desc: string;
  toggleKey: "daoAirdrop" | "burnFee" | "creatorFee";
}) {
  const { state, toggleFeature } = useLaunchpad();
  const on = state.toggles[toggleKey];

  return (
    <button
      type="button"
      className="toggle-row"
      onClick={() => toggleFeature(toggleKey)}
    >
      <div className="toggle-info">
        <div className="toggle-name">{name}</div>
        <div className="toggle-desc">{desc}</div>
      </div>
      <div className={`toggle${on ? " on" : ""}`} />
    </button>
  );
}

export function LogoUpload() {
  const { state, dispatch } = useLaunchpad();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch({
        type: "SET_LOGO",
        url: ev.target?.result as string,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="field">
      <label className="field-label">
        Token Logo <span className="badge">Platform Metadata</span>
      </label>
      <button
        type="button"
        className={`logo-upload-zone${state.logoUrl ? " has-logo" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        {!state.logoUrl ? (
          <div className="logo-upload-inner">
            <div className="logo-upload-icon">⬆</div>
            <div className="logo-upload-text">Click to upload logo</div>
            <div className="logo-upload-sub">
              PNG, JPG or SVG · Max 2MB · Recommended 256×256px
            </div>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-upload-preview" src={state.logoUrl} alt="Logo preview" />
            <div className="logo-upload-meta">
              <span className="logo-upload-filename">{state.logoFileName}</span>
              <span className="logo-upload-change">Click to change</span>
            </div>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <div className="small-note" style={{ marginTop: 6 }}>
        Logo is stored in object storage and referenced from the Metaplex metadata uri at
        launch — not as an on-chain account field.
      </div>
    </div>
  );
}
