"use client";

import { useEffect } from "react";
import { LaunchSuccess } from "./launch-success";
import { LaunchpadProvider, useLaunchpad } from "./launchpad-context";
import { PreviewSidebar } from "./preview-sidebar";
import { StepsBar } from "./steps-bar";
import { BackingStep } from "./steps/backing-step";
import { FeesStep } from "./steps/fees-step";
import { IdentityStep } from "./steps/identity-step";
import { ReviewStep } from "./steps/review-step";
import { TokenomicsStep } from "./steps/tokenomics-step";
import { usePaintRangeSliders } from "./use-paint-range-sliders";

function WizardContent() {
  const { state, dispatch, launchSolve } = useLaunchpad();
  usePaintRangeSliders(!state.launched, state.currentStep);

  useEffect(() => {
    dispatch({ type: "SYNC_ALLOC", changed: "init" });
    dispatch({ type: "UPDATE_FEES" });
  }, [dispatch]);

  useEffect(() => {
    if (launchSolve?.minRaise !== undefined && isFinite(launchSolve.minRaise)) {
      dispatch({ type: "SET_FIELD", field: "lastMinRaise", value: launchSolve.minRaise });
    }
  }, [launchSolve?.minRaise, dispatch]);

  if (state.launched) {
    return (
      <section className="launch-body section-shell page-wrapper">
        <LaunchSuccess />
      </section>
    );
  }

  return (
    <>
      <section className="subhero section-shell launch-hero">
        <p className="eyebrow">LAUNCHPAD</p>
        <h1>Create your reinforced token</h1>
        <p>
          Launch a treasury-backed token inheriting the full collateral chain, down to gold. No
          creator access to funds, ever. Built-in end of life protection.
        </p>
      </section>
      <section className="launch-body section-shell page-wrapper">
        <StepsBar />
        <div className="launch-layout">
          <div>
            {state.currentStep === 1 && <IdentityStep />}
            {state.currentStep === 2 && <TokenomicsStep />}
            {state.currentStep === 3 && <BackingStep />}
            {state.currentStep === 4 && <FeesStep />}
            {state.currentStep === 5 && <ReviewStep />}
          </div>
          <PreviewSidebar />
        </div>
      </section>
    </>
  );
}

export function LaunchpadWizard() {
  return (
    <LaunchpadProvider>
      <WizardContent />
    </LaunchpadProvider>
  );
}
