"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SaleType } from "@/lib/launchpad/types";

const OPTIONS: { value: SaleType; title: string; detail: string; disabled?: boolean }[] = [
  { value: "fixed", title: "Fixed price", detail: "Certainty" },
  { value: "dutch", title: "Reverse Dutch", detail: "Unavailable", disabled: true },
  { value: "overflow", title: "Overflow pool", detail: "Unavailable", disabled: true },
];

export function SaleTypeSelect({
  value,
  onChange,
}: {
  value: SaleType;
  onChange: (value: SaleType) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`sale-type-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="sale-type-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="sale-type-trigger-copy">
          <span className="sale-type-trigger-title">{selected.title}</span>
          <span className="sale-type-trigger-detail">{selected.detail}</span>
        </span>
        <svg className="sale-type-chevron" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" />
        </svg>
      </button>
      {open ? (
        <div className="sale-type-menu" id={listId} role="listbox" aria-label="Sale type">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`sale-type-option${option.value === value ? " is-selected" : ""}`}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span className="sale-type-option-title">{option.title}</span>
              <span className="sale-type-option-detail">{option.detail}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
