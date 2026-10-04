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
    const page = document.querySelector(".launch-page");
    if (!page) return;
    const stopNumberScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "number") return;
      if (document.activeElement !== target) return;
      event.preventDefault();
      target.blur();
    };
    page.addEventListener("wheel", stopNumberScroll, { capture: true, passive: false });
    return () => page.removeEventListener("wheel", stopNumberScroll, { capture: true });
  }, []);

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
        <h1>Create your EOL token</h1>
        <p>
          Launch a treasury-backed token. No creator access to the treasury, ever. Your runway sits in
          escrow and releases on the schedule you set at launch. Built-in end of life protection.
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
