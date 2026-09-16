import type { FeeState, ToggleStates } from "./types";

const PROTOCOL_FEE = 0.15;
const CTOKEN_RESERVE_FEE = 0.05;
const MIN_LP = 0.10;
const MIN_TREASURY = 0.10;
const MAX_CREATOR = 0.5;
const FIXED = PROTOCOL_FEE + CTOKEN_RESERVE_FEE;

export type FeeChangeSource = "lp" | "treasury" | "burn" | "creator" | "total";

export type FeeCalculationInput = {
  totalFee: number;
  lpFee: number;
  treasuryFee: number;
  burnFee: number;
  creatorFee: number;
  toggles: ToggleStates;
  changed?: FeeChangeSource;
};

export function calculateFees(input: FeeCalculationInput): FeeState {
  const { totalFee, toggles, changed } = input;
  const burnOn = toggles.burnFee;
  const creatorOn = toggles.creatorFee;
  const MIN_BURN = burnOn ? 0.05 : 0;
  const adjustable = parseFloat((totalFee - FIXED).toFixed(2));

  let lp = input.lpFee;
  let tre = input.treasuryFee;
  let burn = burnOn ? input.burnFee : 0;
  let creator = creatorOn ? input.creatorFee : 0;
  let over = false;

  if (changed === "lp") {
    const room = parseFloat((adjustable - tre - burn - creator).toFixed(2));
    if (lp > room) {
      lp = Math.max(MIN_LP, room);
      over = true;
    }
    if (lp < MIN_LP) lp = MIN_LP;
  } else if (changed === "treasury") {
    const room = parseFloat((adjustable - lp - burn - creator).toFixed(2));
    if (tre > room) {
      tre = Math.max(MIN_TREASURY, room);
      over = true;
    }
    if (tre < MIN_TREASURY) tre = MIN_TREASURY;
  } else if (changed === "burn") {
    const room = parseFloat((adjustable - lp - tre - creator).toFixed(2));
    if (burn > room) {
      burn = Math.max(MIN_BURN, room);
      over = true;
    }
    if (burnOn && burn < MIN_BURN) burn = MIN_BURN;
  } else if (changed === "creator") {
    const room = parseFloat((adjustable - lp - tre - burn).toFixed(2));
    if (creator > room) {
      creator = Math.max(0, room);
      over = true;
    }
    if (creator > MAX_CREATOR) creator = MAX_CREATOR;
    if (creator < 0) creator = 0;
  }

  const sum = parseFloat((lp + tre + burn + creator).toFixed(2));
  if (sum > adjustable) {
    over = true;
    let excess = parseFloat((sum - adjustable).toFixed(2));
    let t = Math.min(excess, creator);
    if (t > 0) {
      creator = parseFloat((creator - t).toFixed(2));
      excess = parseFloat((excess - t).toFixed(2));
    }
    t = Math.min(excess, parseFloat((burn - MIN_BURN).toFixed(2)));
    if (t > 0) {
      burn = parseFloat((burn - t).toFixed(2));
      excess = parseFloat((excess - t).toFixed(2));
    }
    t = Math.min(excess, parseFloat((tre - MIN_TREASURY).toFixed(2)));
    if (t > 0) {
      tre = parseFloat((tre - t).toFixed(2));
      excess = parseFloat((excess - t).toFixed(2));
    }
    t = Math.min(excess, parseFloat((lp - MIN_LP).toFixed(2)));
    if (t > 0) {
      lp = parseFloat((lp - t).toFixed(2));
    }
  }

  return {
    totalFee,
    lpFee: lp,
    treasuryFee: tre,
    burnFee: burn,
    creatorFee: creator,
    feeWarning: over,
    lpMax: Math.max(MIN_LP, parseFloat((adjustable - tre - burn - creator).toFixed(2))),
    treasuryMax: Math.max(MIN_TREASURY, parseFloat((adjustable - lp - burn - creator).toFixed(2))),
    burnMax: Math.min(1, Math.max(MIN_BURN, parseFloat((adjustable - lp - tre - creator).toFixed(2)))),
    creatorMax: Math.min(MAX_CREATOR, Math.max(0, parseFloat((adjustable - lp - tre - burn).toFixed(2)))),
  };
}

export function feeSegmentPct(value: number, totalFee: number): number {
  return totalFee > 0 ? (value / totalFee) * 100 : 0;
}

export { PROTOCOL_FEE, CTOKEN_RESERVE_FEE };
