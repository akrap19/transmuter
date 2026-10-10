"use client";

import { FieldHint } from "./field-hint";
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
    <div className="toggle-row">
      <div className="toggle-name">
        <button
          type="button"
          className="toggle-name-hit"
          aria-pressed={on}
          onClick={() => toggleFeature(toggleKey)}
        >
          {name}
        </button>
        <FieldHint label={`About ${name}`}>{desc}</FieldHint>
      </div>
      <button
        type="button"
        className="toggle-switch"
        aria-label={name}
        aria-pressed={on}
        onClick={() => toggleFeature(toggleKey)}
      >
        <span className={`toggle${on ? " on" : ""}`} />
      </button>
    </div>
  );
}
