"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { syncAllocation } from "@/lib/launchpad/allocation-sync";
import { type FeeChangeSource } from "@/lib/launchpad/fee-calculator";
import { solveFromState } from "@/lib/launchpad/launch-solver";
import { launchpadReducer, type LaunchpadAction } from "@/lib/launchpad/launchpad-reducer";
import {
  initialLaunchpadState,
  type FeeState,
  type LaunchpadState,
  type ToggleKey,
} from "@/lib/launchpad/types";

type LaunchpadContextValue = {
  state: LaunchpadState;
  dispatch: React.Dispatch<LaunchpadAction>;
  setField: <K extends keyof LaunchpadState>(field: K, value: LaunchpadState[K]) => void;
  goToStep: (step: number) => void;
  toggleFeature: (key: ToggleKey) => void;
  syncAlloc: (changed: Parameters<typeof syncAllocation>[1]) => void;
  updateFees: (
    changed?: FeeChangeSource,
    totalFee?: number,
    feeOverrides?: Partial<Pick<FeeState, "lpFee" | "treasuryFee" | "burnFee" | "creatorFee">>,
  ) => void;
  launchSolve: ReturnType<typeof solveFromState>;
};

const LaunchpadContext = createContext<LaunchpadContextValue | null>(null);

export function LaunchpadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(launchpadReducer, initialLaunchpadState);

  const setField = useCallback(<K extends keyof LaunchpadState>(field: K, value: LaunchpadState[K]) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "GO_TO_STEP", step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleFeature = useCallback((key: ToggleKey) => {
    dispatch({ type: "TOGGLE", key });
  }, []);

  const syncAlloc = useCallback((changed: Parameters<typeof syncAllocation>[1]) => {
    dispatch({ type: "SYNC_ALLOC", changed });
  }, []);

  const updateFees = useCallback((
    changed?: FeeChangeSource,
    totalFee?: number,
    feeOverrides?: Partial<Pick<FeeState, "lpFee" | "treasuryFee" | "burnFee" | "creatorFee">>,
  ) => {
    dispatch({ type: "UPDATE_FEES", changed, totalFee, feeOverrides });
  }, []);

  const launchSolveResult = useMemo(() => solveFromState(state), [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      setField,
      goToStep,
      toggleFeature,
      syncAlloc,
      updateFees,
      launchSolve: launchSolveResult,
    }),
    [state, setField, goToStep, toggleFeature, syncAlloc, updateFees, launchSolveResult],
  );

  return <LaunchpadContext.Provider value={value}>{children}</LaunchpadContext.Provider>;
}

export function useLaunchpad() {
  const ctx = useContext(LaunchpadContext);
  if (!ctx) throw new Error("useLaunchpad must be used within LaunchpadProvider");
  return ctx;
}

export type { SaleType, VestingPreset, CToken } from "@/lib/launchpad/types";
