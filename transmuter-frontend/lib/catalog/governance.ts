import { formatAmount, formatBps } from "./format";
import type { CoinStake, CoinVote, OpenVoteKind } from "./types";

export const VOTER_LOCK_SECS = 7 * 24 * 3600;

/** Registry and DAO stay shims. A community-vote read reports quorum not met. */
export const DAO_SHIM_QUORUM_MET = false as const;

export type VoteTally = {
  cast: number;
  yesBps: number;
  reachedQuorumBps: number;
  quorumMet: boolean;
  passing: boolean;
};

export type CastVoteResult =
  | { ok: true; weight: number; lockUntil: number; yes: boolean }
  | { ok: false; reason: string };

function toBps(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.floor((part * 10_000) / whole);
}

export function voteThresholds(kind: OpenVoteKind) {
  if (kind === "liquidation") return { passBps: 6_700, quorumBps: 1_000 };
  if (kind === "reserve_mint") return { passBps: 5_500, quorumBps: 300 };
  return { passBps: 5_500, quorumBps: 1_000 };
}

export function voteTally(vote: CoinVote): VoteTally {
  const cast = vote.yesWeight + vote.noWeight;
  const yesBps = toBps(vote.yesWeight, cast);
  const reachedQuorumBps = toBps(cast, vote.denom);
  const quorumMet = reachedQuorumBps >= vote.quorumBps;
  return {
    cast,
    yesBps,
    reachedQuorumBps,
    quorumMet,
    passing: quorumMet && yesBps >= vote.passBps,
  };
}

export function holderOutcome(tally: VoteTally, daoQuorumMet: boolean) {
  return { decidedByHolders: !daoQuorumMet, passing: tally.passing };
}

export function voteReadout(vote: CoinVote, tally: VoteTally = voteTally(vote)) {
  const yesNeed = formatBps(vote.passBps);
  const turnoutNeed = formatBps(vote.quorumBps);
  const supply = formatAmount(vote.denom);
  const yesLine =
    tally.cast <= 0
      ? `No votes yet. This vote needs ${yesNeed} yes to pass.`
      : `${formatBps(tally.yesBps)} of the votes are yes. This vote needs ${yesNeed} yes to pass.`;
  const turnoutLine = `${formatBps(tally.reachedQuorumBps)} of the ${supply} token supply has voted. This vote needs ${turnoutNeed} turnout.`;
  return { yesLine, turnoutLine };
}

export function evaluateCastVote(
  vote: CoinVote,
  stake: CoinStake,
  now: number,
  yes: boolean,
): CastVoteResult {
  if (now >= vote.closesAt) return { ok: false, reason: "closed" };
  if (stake.voterLockedUntil != null && now < stake.voterLockedUntil) return { ok: false, reason: "voted" };
  if (stake.weight <= 0) return { ok: false, reason: "weight" };
  return { ok: true, weight: stake.weight, lockUntil: vote.closesAt + VOTER_LOCK_SECS, yes };
}
