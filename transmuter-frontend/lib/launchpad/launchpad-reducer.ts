import { syncAllocation } from "./allocation-sync";
import type { PendingWire } from "./mint-secret";
import { calculateFees, type FeeChangeSource } from "./fee-calculator";
import { solveFromState } from "./launch-solver";
import { assetMeta, primaryBackingAsset, setBasketWeight, type BackingAsset } from "./backing-basket";
import {
  CTOKENS,
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
  | { type: "SET_BACKING_WEIGHT"; asset: BackingAsset; weight: number }
  | { type: "SYNC_ALLOC"; changed: Parameters<typeof syncAllocation>[1] }
  | { type: "UPDATE_FEES"; changed?: FeeChangeSource; totalFee?: number; feeOverrides?: Partial<Pick<FeeState, "lpFee" | "treasuryFee" | "burnFee" | "creatorFee">> }
  | { type: "SET_LOGO"; url: string | null; fileName: string | null }
  | { type: "ON_ESCROW_INPUT"; escrowNeed?: string; tokenSupply?: string }
  | { type: "SET_TREASURY_BACKING"; pct: number }
  | { type: "USE_MINIMUM_RAISE" }
  | { type: "LAUNCH_STATUS"; status: Exclude<LaunchStatus, "idle" | "success" | "error"> }
  | { type: "LAUNCH_ERROR"; error: string }
  | { type: "LAUNCH_SUCCESS"; mint: string; signature: string; launchId: number; metadataUri: string }
  | { type: "RESUME_WIRE"; pending: PendingWire }
  | { type: "DISMISS_LAUNCHED" }
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
          "dao",
        );
        next = { ...next, ...synced };
      }
      return next;
    }
    case "SET_VESTING":
      return { ...state, vesting: action.vesting };
    case "SELECT_CTOKEN":
      return { ...state, selectedCToken: action.cToken };
    case "SET_BACKING_WEIGHT": {
      const backingBasket = setBasketWeight(state.backingBasket, action.asset, action.weight);
      return { ...state, backingBasket, selectedCToken: primaryCtoken(backingBasket, state.selectedCToken) };
    }
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
      return withSolvedRaise({ ...state, ...synced }, true);
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
      return withSolvedRaise(next, true);
    }
    case "SET_TREASURY_BACKING": {
      const pct = Math.max(10, action.pct);
      return withSolvedRaise({ ...state, treasuryBackingPct: pct, raiseTouched: false }, false);
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
    case "RESUME_WIRE":
      return {
        ...state,
        launched: true,
        launchStatus: "success",
        launchError: null,
        launchId: action.pending.launchId,
        launchedMint: action.pending.mint,
        tokenName: action.pending.tokenName,
        tokenTicker: action.pending.tokenTicker,
        selectedCToken: { ...state.selectedCToken, name: action.pending.backingName },
      };
    case "DISMISS_LAUNCHED":
      return state.launched ? initialLaunchpadState : state;
    case "RESET":
      return initialLaunchpadState;
    default:
      return state;
  }
}

/** Keep `selectedCToken` aligned with the basket's heavier live-cToken leg (SOL/BTC). */
function primaryCtoken(basket: LaunchpadState["backingBasket"], current: CToken): CToken {
  const name = assetMeta(primaryBackingAsset(basket)).cToken;
  return CTOKENS.find((token) => token.name === name) ?? current;
}

function withSolvedRaise(state: LaunchpadState, preserveHeadroom: boolean): LaunchpadState {
  const cur = parseFloat(state.targetRaise);
  const headroom =
    preserveHeadroom && state.raiseTouched && cur && !isNaN(cur)
      ? Math.max(0, cur - state.lastMinRaise)
      : 0;
  const solved = solveFromState(state);
  if (solved?.minRaise !== undefined && isFinite(solved.minRaise)) {
    return {
      ...state,
      targetRaise: String(Math.round(solved.minRaise + headroom)),
      lastMinRaise: solved.minRaise,
    };
  }
  return state;
}
