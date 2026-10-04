"use client";

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
