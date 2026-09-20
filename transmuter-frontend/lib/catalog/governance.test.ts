import { describe, expect, it } from "vitest";
import {
  evaluateCastVote,
  holderOutcome,
  voteTally,
  voteThresholds,
} from "./governance";
import type { CoinStake, CoinVote } from "./types";

const STAKE: CoinStake = {
  staked: 10,
  weight: 10,
  voterLockedUntil: null,
  walletBalance: 40,
  feeBps: 0,
  liquidated: false,
};

const SOLACE: CoinVote = {
  kind: "liquidation",
  closesAt: 1_747_000_000,
  yesWeight: 5_200,
  noWeight: 800,
  quorumBps: 1_000,
  passBps: 6_700,
  denom: 15_000,
};

const FORGE: CoinVote = {
  kind: "reserve_mint",
  closesAt: 1_746_900_000,
  yesWeight: 4_200,
  noWeight: 6_800,
  quorumBps: 300,
  passBps: 5_500,
  denom: 20_000,
};

describe("governance votes", () => {
  it("uses 67%/10% for liquidation and 55%/3% for Path B; escrow is a holder vote", () => {
    expect(voteThresholds("liquidation")).toEqual({ passBps: 6_700, quorumBps: 1_000 });
    expect(voteThresholds("reserve_mint")).toEqual({ passBps: 5_500, quorumBps: 300 });
    expect(voteThresholds("escrow_halt")).toEqual({ passBps: 5_500, quorumBps: 1_000 });
    expect(voteThresholds("escrow_resume")).toEqual({ passBps: 5_500, quorumBps: 1_000 });
    expect(voteThresholds("escrow_advance")).toEqual({ passBps: 5_500, quorumBps: 1_000 });
  });

  it("tallies yes of participating weight against circulating denom, never staked supply", () => {
    expect(voteTally(SOLACE)).toEqual({
      cast: 6_000,
      yesBps: 8_666,
      reachedQuorumBps: 4_000,
      quorumMet: true,
      passing: true,
    });
    expect(voteTally(FORGE)).toEqual({
      cast: 11_000,
      yesBps: 3_818,
      reachedQuorumBps: 5_500,
      quorumMet: true,
      passing: false,
    });
    expect(voteTally({ ...SOLACE, yesWeight: 0, noWeight: 0 })).toEqual({
      cast: 0,
      yesBps: 0,
      reachedQuorumBps: 0,
      quorumMet: false,
      passing: false,
    });
  });

  it("lets the holder tally stand when the DAO shim reports no quorum", () => {
    expect(holderOutcome(voteTally(SOLACE), false)).toEqual({
      decidedByHolders: true,
      passing: true,
    });
    expect(holderOutcome(voteTally(FORGE), false)).toEqual({
      decidedByHolders: true,
      passing: false,
    });
  });

  it("casts with snapshot weight and sets voter-lock to close plus seven days", () => {
    expect(evaluateCastVote(SOLACE, STAKE, 1_746_000_000, true)).toEqual({
      ok: true,
      weight: 10,
      lockUntil: 1_747_604_800,
      yes: true,
    });
    expect(evaluateCastVote(SOLACE, { ...STAKE, weight: 0 }, 1_746_000_000, true)).toEqual({
      ok: false,
      reason: "weight",
    });
    expect(evaluateCastVote(SOLACE, STAKE, 1_747_000_000, false)).toEqual({
      ok: false,
      reason: "closed",
    });
  });
});
