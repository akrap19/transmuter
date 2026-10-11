"use client";

import "@/app/brand/launchpad.css";
import { createPortal } from "react-dom";
import { POST_SALE_LABELS } from "@/lib/catalog/post-sale";
import type { FallbackStep } from "./use-submit-post-sale";

type StepsHook = {
  steps: FallbackStep[] | null;
  closeSteps: () => void;
  busy: boolean;
  error: string | null;
  explorerUrl: string | null;
};

/** The launchpad's wiring modal, for finalize: one wallet approval per step, shown in order. */
export function PostSaleStepsModal({ title, tx }: { title: string; tx: StepsHook }) {
  if (typeof document === "undefined" || !tx.steps) return null;
  const steps = tx.steps;
  const doneCount = steps.filter((step) => step.state === "done").length;
  const failed = steps.find((step) => step.state === "failed");

  return createPortal(
    <div className="launch-page wire-portal">
      <div className="wire-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
        <div className="wire-modal">
          <div className="launch-success-title">{title.toUpperCase()}</div>
          <div className="wire-progress-head">
            <span>
              Step {Math.min(doneCount + 1, steps.length)} of {steps.length}
            </span>
            <span>{Math.round((doneCount / steps.length) * 100)}%</span>
          </div>
          <div className="wire-progress" aria-hidden="true">
            <div className="wire-progress-fill" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>

          <ol className="wire-steps">
            {steps.map((step, index) => (
              <li key={`${step.kind}-${index}`} className={`wire-step is-${nodeClass(step.state)}`}>
                <span className="wire-node">
                  {step.state === "done" ? "✓" : step.state === "failed" ? "✕" : step.state === "active" ? <span className="wire-spinner" aria-hidden="true" /> : index + 1}
                </span>
                <span className="wire-step-body">
                  <span className="wire-step-label">{POST_SALE_LABELS[step.kind]}</span>
                  <span className="wire-status">{statusLabel(step.state)}</span>
                  {step.error ? <span className="wire-step-error">{step.error}</span> : null}
                </span>
              </li>
            ))}
          </ol>

          <p className="wire-modal-note">
            Your wallet did not approve the steps together, so each one is signed in turn. The steps run in this order because the pools must exist before convert.
          </p>

          {tx.busy ? (
            <p className="wire-banner wire-banner-info">
              <span className="wire-spinner" aria-hidden="true" />
              Approve the transaction in your wallet…
            </p>
          ) : failed ? (
            <p className="wire-banner">{failed.error ?? tx.error}</p>
          ) : null}

          {tx.explorerUrl ? (
            <a className="wire-tx-link" href={tx.explorerUrl} target="_blank" rel="noreferrer">
              View last transaction
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}

          <div className="launch-success-actions">
            <button type="button" className="btn btn-outline" onClick={tx.closeSteps} disabled={tx.busy}>
              {doneCount === steps.length ? "Done" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function nodeClass(state: FallbackStep["state"]): string {
  if (state === "waiting") return "next";
  return state;
}

function statusLabel(state: FallbackStep["state"]): string {
  if (state === "active") return "Signing…";
  if (state === "done") return "Done";
  if (state === "failed") return "Failed";
  return "Next";
}
