"use client";

import { launchMissingLabels, launchValidationIssues } from "@/lib/launchpad/map-create-launch";
import { launchReviewSections, type ReviewRowModel } from "@/lib/launchpad/review-summary";
import { useLaunchpad } from "../launchpad-context";
import { LaunchDeployBar } from "../launch-deploy-bar";
import { useSubmitLaunch } from "../use-submit-launch";

export function ReviewStep() {
  const { state, goToStep, launchSolve } = useLaunchpad();
  const { submit, busy, connected } = useSubmitLaunch();
  const missing = launchMissingLabels(state);
  const sections = launchReviewSections(state, launchSolve);

  async function handleLaunch() {
    if (launchValidationIssues(state).length > 0) return;
    await submit();
  }

  return (
    <div className={`step-panel panel${state.currentStep === 5 ? " active" : ""}`}>
      <div className="panel-title"><div className="dot" />Review & Launch</div>
      <div className="launch-warning">
        <strong>Before you launch.</strong> Deploying opens your sale. Buyers claim tokens only
        after it concludes. Deposits stay withdrawable until the sale concludes; if the raise can&apos;t fund
        the backing minimums (treasury {state.treasuryBackingPct}% ask in this wizard; on-chain accept 8% of MCP
        after conversion, combined 18%), the launch voids and
        every deposit is reclaimable. Once finalized, the treasury is fully non-custodial: no
        human, including you, can access it. End of life requires a community vote.
      </div>

      <div className="review-grid">
        {sections.map((section) => (
          <ReviewBlock key={section.title} title={section.title}>
            {section.rows.map((row) => (
              <ReviewRow
                key={row.label}
                row={row}
                image={row.logo ? state.logoUrl : null}
              />
            ))}
          </ReviewBlock>
        ))}
      </div>

      <LaunchDeployBar
        busy={busy}
        connected={connected}
        missing={missing}
        onBack={() => goToStep(4)}
        onLaunch={handleLaunch}
      />
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="review-block">
      <div className="review-block-title">{title}</div>
      {children}
    </div>
  );
}

function ReviewRow({ row, image }: { row: ReviewRowModel; image?: string | null }) {
  return (
    <div className={`review-item${row.stacked ? " is-stacked" : ""}${row.error ? " is-error" : ""}`}>
      <span className="review-item-label">{row.label}</span>
      <span className="review-item-value">
        {image ? (
          <span className="review-logo-value">
            {/* Data URLs from the logo picker are not a remote image host. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="review-logo" src={image} alt="" />
            {row.value}
          </span>
        ) : (
          row.value
        )}
      </span>
    </div>
  );
}
