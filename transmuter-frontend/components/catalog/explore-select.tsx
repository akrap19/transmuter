"use client";

import { useState, type PointerEvent } from "react";
import { ChevronDownIcon } from "lucide-react";

export type ExploreSelectOption = {
  value: string;
  label: string;
};

type ExploreSelectProps = {
  label: string;
  value: string;
  options: ExploreSelectOption[];
  onValueChange: (value: string) => void;
};

export function ExploreSelect({ label, value, options, onValueChange }: ExploreSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOpen(false);
  }

  return (
    <div className="explore-field" onPointerEnter={() => setOpen(true)} onPointerLeave={handlePointerLeave}>
      <span>{label}</span>
      <button
        type="button"
        className="explore-select-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronDownIcon />
      </button>
      {open ? (
        <div className="explore-select-content" role="listbox" aria-label={label}>
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                className="explore-select-item"
                data-state={checked ? "checked" : "unchecked"}
                onClick={() => {
                  setOpen(false);
                  onValueChange(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
