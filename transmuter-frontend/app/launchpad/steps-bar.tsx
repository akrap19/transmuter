"use client";

import { STEP_LABELS } from "@/lib/launchpad/types";
import { useLaunchpad } from "./launchpad-context";

export function StepsBar() {
  const { state, goToStep } = useLaunchpad();
  const { currentStep } = state;

  return (
    <div className="steps-bar">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isActive = currentStep === step;
        const isDone = currentStep > step;
        return (
          <div key={label} style={{ display: "contents" }}>
            {i > 0 && (
              <div className={`step-line${isDone ? " done" : ""}`} />
            )}
            <button
              type="button"
              className={`step-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
              onClick={() => goToStep(step)}
            >
              <div className="step-dot">{step}</div>
              <div className="step-label">{label}</div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
