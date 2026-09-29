"use client";

import type { WireChecklistItem } from "@/lib/launchpad/wire-plan";

const STATE_LABEL: Record<WireChecklistItem["state"], string> = {
  done: "Done",
  next: "Next",
  waiting: "Waiting",
  failed: "Failed",
};

export function WireChecklist({ steps }: { steps: WireChecklistItem[] }) {
  return (
    <ol className="wire-checklist">
      {steps.map((step) => (
        <li key={step.id} className={`wire-step wire-step-${step.state}`}>
          <span>{step.label}</span>
          <span className="wire-status">{STATE_LABEL[step.state]}</span>
          {step.error ? <span className="wire-step-error">{step.error}</span> : null}
        </li>
      ))}
    </ol>
  );
}
