import { LP_ALLOC_MIN } from "./floors";
import type { AllocationState } from "./types";

export type SyncAllocSource =
  | "lp"
  | "team"
  | "public"
  | "investors"
  | "dao"
  | "init";

export function syncAllocation(
  state: AllocationState,
  changed: SyncAllocSource,
): AllocationState {
  let lp = state.allocLP;
  let team = state.allocTeam;
  let pub = state.allocPublic;
  let investors = state.showInvestors ? state.allocInvestors : 0;
  const dao = state.daoAirdrop ? state.daoAirdropPct : 0;

  if (pub < 40) {
    pub = 40;
  }

  const MAX = 100;
  const fixedSum = dao;
  const pubMin = 20;
  const total = lp + team + pub + investors + fixedSum;

  if (total > MAX) {
    const excess = total - MAX;
    if (changed === "investors" || changed === "init") {
      investors = Math.max(0, investors - excess);
    } else if (changed === "team") {
      team = Math.max(0, team - excess);
    } else if (changed === "lp") {
      lp = Math.max(LP_ALLOC_MIN, lp - excess);
    } else if (changed === "public") {
      let rem = excess;
      if (state.showInvestors && investors > 0) {
        const cut = Math.min(investors, rem);
        investors -= cut;
        rem -= cut;
      }
      if (rem > 0 && team > 0) {
        const cut = Math.min(team, rem);
        team -= cut;
        rem -= cut;
      }
      if (rem > 0 && lp > LP_ALLOC_MIN) {
        const cut = Math.min(lp - LP_ALLOC_MIN, rem);
        lp -= cut;
        rem -= cut;
      }
      if (rem > 0) {
        pub = Math.max(pubMin, pub - rem);
      }
    } else if (changed === "dao") {
      let rem = excess;
      if (state.showInvestors && investors > 0) {
        const cut = Math.min(investors, rem);
        investors -= cut;
        rem -= cut;
      }
      if (rem > 0 && team > 0) {
        const cut = Math.min(team, rem);
        team -= cut;
        rem -= cut;
      }
      if (rem > 0 && lp > LP_ALLOC_MIN) {
        const cut = Math.min(lp - LP_ALLOC_MIN, rem);
        lp -= cut;
      }
    }
  }

  return {
    ...state,
    allocLP: lp,
    allocTeam: team,
    allocPublic: pub,
    allocInvestors: investors,
  };
}

export function getAllocationTotal(state: AllocationState): number {
  const investors = state.showInvestors ? state.allocInvestors : 0;
  const dao = state.daoAirdrop ? state.daoAirdropPct : 0;
  return state.allocLP + state.allocTeam + state.allocPublic + investors + dao;
}
