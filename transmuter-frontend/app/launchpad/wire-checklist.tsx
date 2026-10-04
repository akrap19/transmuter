"use client";

import type { WireChecklistItem, WireStepId } from "@/lib/launchpad/wire-plan";

const STATE_LABEL: Record<WireChecklistItem["state"], string> = {
  done: "Done",
  next: "Next",
  waiting: "Waiting",
  failed: "Failed",
};

type NodeState = "done" | "active" | "next" | "waiting" | "failed";

export function WireChecklist({
  steps,
  activeId = null,
  running = false,
}: {
  steps: WireChecklistItem[];
  activeId?: WireStepId | null;
  running?: boolean;
}) {
  return (
    <ol className="wire-steps">
      {steps.map((step, index) => {
        const node = nodeState(step, step.id === activeId && running);
        return (
          <li key={step.id} className={`wire-step is-${node}`}>
            <span className="wire-node">{nodeGlyph(node, index)}</span>
            <span className="wire-step-body">
              <span className="wire-step-label">{step.label}</span>
              <span className="wire-status">{node === "active" ? "Signing…" : STATE_LABEL[step.state]}</span>
              {step.error ? <span className="wire-step-error">{step.error}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function nodeState(step: WireChecklistItem, isActive: boolean): NodeState {
  if (step.state === "failed") return "failed";
  if (isActive) return "active";
  return step.state;
}

function nodeGlyph(node: NodeState, index: number) {
  if (node === "done") return <span className="wire-node-icon">✓</span>;
  if (node === "failed") return <span className="wire-node-icon">✕</span>;
  if (node === "active") return <span className="wire-spinner" aria-hidden="true" />;
  return index + 1;
}
