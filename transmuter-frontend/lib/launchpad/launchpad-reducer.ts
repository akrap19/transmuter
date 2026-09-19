import { syncAllocation } from "./allocation-sync";
import { calculateFees, type FeeChangeSource } from "./fee-calculator";
import { solveFromState } from "./launch-solver";
import {
  initialLaunchpadState,
  type FeeState,
  type LaunchpadState,
  type LaunchStatus,
  type ToggleKey,
  type VestingPreset,
  type CToken,
} from "./types";

export type LaunchpadAction =
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
  | { type: "LAUNCH_STATUS"; status: Exclude<LaunchStatus, "idle" | "success" | "error"> }
  | { type: "LAUNCH_ERROR"; error: string }
  | { type: "LAUNCH_SUCCESS"; mint: string; signature: string; launchId: number; metadataUri: string }
  | { type: "RESET" };

export function launchpadReducer(state: LaunchpadState, action: LaunchpadAction): LaunchpadState {
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
    case "LAUNCH_STATUS":
      return { ...state, launchStatus: action.status, launchError: null };
    case "LAUNCH_ERROR":
      return { ...state, launched: false, launchStatus: "error", launchError: action.error };
    case "LAUNCH_SUCCESS":
      return {
        ...state,
        launched: true,
        launchStatus: "success",
        launchError: null,
        launchedMint: action.mint,
        launchSignature: action.signature,
        launchId: action.launchId,
        metadataUri: action.metadataUri,
      };
    case "RESET":
      return initialLaunchpadState;
    default:
      return state;
  }
}
