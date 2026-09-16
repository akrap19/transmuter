"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { syncAllocation } from "@/lib/launchpad/allocation-sync";
import { calculateFees, type FeeChangeSource } from "@/lib/launchpad/fee-calculator";
import { solveFromState } from "@/lib/launchpad/launch-solver";
import {
  initialLaunchpadState,
  type FeeState,
  type LaunchpadState,
  type ToggleKey,
  type VestingPreset,
  type CToken,
  type SaleType,
} from "@/lib/launchpad/types";

type Action =
  | { type: "SET_FIELD"; field: keyof LaunchpadState; value: LaunchpadState[keyof LaunchpadState] }
  | { type: "GO_TO_STEP"; step: number }
  | { type: "TOGGLE"; key: ToggleKey }
  | { type: "SET_VESTING"; vesting: VestingPreset }
  | { type: "SELECT_CTOKEN"; cToken: CToken }
  | { type: "SYNC_ALLOC"; changed: Parameters<typeof syncAllocation>[1] }
  | { type: "UPDATE_FEES"; changed?: FeeChangeSource; totalFee?: number; feeOverrides?: Partial<Pick<FeeState, "lpFee" | "treasuryFee" | "burnFee" | "creatorFee">> }
  | { type: "SET_LOGO"; url: string | null; fileName: string | null }
  | { type: "ON_ESCROW_INPUT"; escrowNeed?: string; tokenSupply?: string }
  | { type: "USE_MINIMUM_RAISE" }
  | { type: "LAUNCH" }
  | { type: "RESET" };

function reducer(state: LaunchpadState, action: Action): LaunchpadState {
  switch (action.type) {
    case "SET_FIELD": {
      const next = { ...state, [action.field]: action.value };
      if (action.field === "targetRaise") {
        next.raiseTouched = true;
      }
      if (action.field === "autoMintTrigger" || action.field === "autoMintDeactivate") {
        const act = next.autoMintTrigger;
        let deact = next.autoMintDeactivate;
        if (deact < act + 10) deact = Math.min(35, act + 10);
        next.autoMintDeactivate = deact;
      }
      return next;
    }
    case "GO_TO_STEP":
      return { ...state, currentStep: action.step };
    case "TOGGLE": {
      const toggles = { ...state.toggles, [action.key]: !state.toggles[action.key] };
      const fees = calculateFees({
        totalFee: state.fees.totalFee,
        lpFee: state.fees.lpFee,
        treasuryFee: state.fees.treasuryFee,
        burnFee: state.fees.burnFee,
        creatorFee: state.fees.creatorFee,
        toggles,
        changed: action.key === "burnFee" ? "burn" : action.key === "creatorFee" ? "creator" : undefined,
      });
      let next = { ...state, toggles, fees };
      if (action.key === "daoAirdrop") {
        const synced = syncAllocation(
          {
            allocLP: next.allocLP,
            allocTeam: next.allocTeam,
            allocPublic: next.allocPublic,
            allocInvestors: next.allocInvestors,
            showInvestors: next.showInvestors,
            daoAirdropPct: next.daoAirdropPct,
            daoAirdrop: toggles.daoAirdrop,
          },
          toggles.daoAirdrop ? "dao" : "lp",
        );
        next = { ...next, ...synced };
      }
      return next;
    }
    case "SET_VESTING":
      return { ...state, vesting: action.vesting };
    case "SELECT_CTOKEN":
      return { ...state, selectedCToken: action.cToken };
    case "SYNC_ALLOC": {
      const synced = syncAllocation(
        {
          allocLP: state.allocLP,
          allocTeam: state.allocTeam,
          allocPublic: state.allocPublic,
          allocInvestors: state.allocInvestors,
          showInvestors: state.showInvestors,
          daoAirdropPct: state.daoAirdropPct,
          daoAirdrop: state.toggles.daoAirdrop,
        },
        action.changed,
      );
      return { ...state, ...synced };
    }
    case "UPDATE_FEES": {
      const totalFee = action.totalFee ?? state.fees.totalFee;
      const overrides = action.feeOverrides ?? {};
      return {
        ...state,
        fees: calculateFees({
          totalFee,
          lpFee: overrides.lpFee ?? state.fees.lpFee,
          treasuryFee: overrides.treasuryFee ?? state.fees.treasuryFee,
          burnFee: overrides.burnFee ?? state.fees.burnFee,
          creatorFee: overrides.creatorFee ?? state.fees.creatorFee,
          toggles: state.toggles,
          changed: action.changed,
        }),
      };
    }
    case "SET_LOGO":
      return { ...state, logoUrl: action.url, logoFileName: action.fileName };
    case "ON_ESCROW_INPUT": {
      const next = {
        ...state,
        ...(action.escrowNeed !== undefined ? { escrowNeed: action.escrowNeed } : {}),
        ...(action.tokenSupply !== undefined ? { tokenSupply: action.tokenSupply } : {}),
      };
      const cur = parseFloat(next.targetRaise);
      const headroom =
        next.raiseTouched && cur && !isNaN(cur)
          ? Math.max(0, cur - next.lastMinRaise)
          : 0;
      const L = solveFromState(next);
      if (L?.minRaise !== undefined && isFinite(L.minRaise)) {
        return {
          ...next,
          targetRaise: String(Math.round(L.minRaise + headroom)),
          lastMinRaise: L.minRaise,
        };
      }
      return next;
    }
    case "USE_MINIMUM_RAISE": {
      const L = solveFromState(state);
      return {
        ...state,
        raiseTouched: false,
        targetRaise:
          L && isFinite(L.minRaise ?? NaN) && (L.minRaise ?? 0) > 0
            ? String(Math.round(L.minRaise!))
            : state.targetRaise,
      };
    }
    case "LAUNCH":
      return { ...state, launched: true };
    case "RESET":
      return initialLaunchpadState;
    default:
      return state;
  }
}

type LaunchpadContextValue = {
  state: LaunchpadState;
  dispatch: React.Dispatch<Action>;
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
  const [state, dispatch] = useReducer(reducer, initialLaunchpadState);

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

export type { SaleType, VestingPreset, CToken };
