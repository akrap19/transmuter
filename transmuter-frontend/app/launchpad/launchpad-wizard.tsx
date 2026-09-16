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
      <div className="layout">
        <LaunchSuccess />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="proto-banner">
          ⚠️ Prototype only - this interface is a visual demonstration. Click through the
          steps to explore the flow; no tokens are minted and no transactions occur.
        </div>
        <div className="page-eyebrow">TRANSMUTER · BY THE MIDAS INITIATIVE</div>
        <h1 className="page-title">
          <span className="c">CREATE</span> YOUR <span className="g">REINFORCED TOKEN</span>
        </h1>
        <p className="page-subtitle">
          Launch a treasury-backed token inheriting the full collateral chain, down to gold.
          No creator access to funds, ever. Built-in end of life protection.
        </p>
      </div>
      <StepsBar />
      <div className="layout">
        <div>
          {state.currentStep === 1 && <IdentityStep />}
          {state.currentStep === 2 && <TokenomicsStep />}
          {state.currentStep === 3 && <BackingStep />}
          {state.currentStep === 4 && <FeesStep />}
          {state.currentStep === 5 && <ReviewStep />}
        </div>
        <PreviewSidebar />
      </div>
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
