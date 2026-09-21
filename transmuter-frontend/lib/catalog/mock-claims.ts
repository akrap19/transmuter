import { MOCK_OTHER_WALLET, MOCK_PREVIEW_WALLET } from "./mock";
import { SCHEDULE_LINEAR_12M, SCHEDULE_NONE } from "./schedule";
import type { CoinEscrow, CoinRedeem, CoinVesting, RedeemLeg } from "./types";

const helixMint = "MintHelix111111111111111111111111111111111";
const forgeMint = "MintForge11111111111111111111111111111111";
const solaceMint = "MintSolace1111111111111111111111111111111";

export const MOCK_VESTING: Record<string, CoinVesting> = {
  [helixMint]: {
    recipient: MOCK_OTHER_WALLET,
    kind: "team",
    schedule: SCHEDULE_LINEAR_12M,
    startTime: 1_745_100_000,
    liquidationTimestamp: 0,
    totalAllocation: 8_000,
    alreadyClaimed: 1_200,
  },
  [forgeMint]: {
    recipient: MOCK_PREVIEW_WALLET,
    kind: "team",
    schedule: SCHEDULE_NONE,
    startTime: 1_745_800_000,
    liquidationTimestamp: 0,
    totalAllocation: 500,
    alreadyClaimed: 0,
  },
  [solaceMint]: {
    recipient: MOCK_OTHER_WALLET,
    kind: "team",
    schedule: SCHEDULE_NONE,
    startTime: 1_743_000_000,
    liquidationTimestamp: 1_746_900_000,
    totalAllocation: 80,
    alreadyClaimed: 80,
  },
};

export const MOCK_ESCROW: Record<string, CoinEscrow> = {
  [helixMint]: {
    teamRecipient: MOCK_OTHER_WALLET,
    schedule: SCHEDULE_LINEAR_12M,
    startTime: 1_745_100_000,
    fundedPrincipal: 4_000,
    alreadyDrawn: 1_000,
    advanceUnlocked: 0,
    status: "active",
  },
  [forgeMint]: {
    teamRecipient: MOCK_PREVIEW_WALLET,
    schedule: SCHEDULE_NONE,
    startTime: 1_745_800_000,
    fundedPrincipal: 1_000,
    alreadyDrawn: 760,
    advanceUnlocked: 0,
    status: "active",
  },
  [solaceMint]: {
    teamRecipient: MOCK_OTHER_WALLET,
    schedule: SCHEDULE_NONE,
    startTime: 1_743_000_000,
    fundedPrincipal: 500,
    alreadyDrawn: 200,
    advanceUnlocked: 0,
    status: "liquidated",
  },
};

export const MOCK_REDEEM_LEGS: Record<string, Record<string, RedeemLeg[]>> = {
  [MOCK_PREVIEW_WALLET]: {
    [solaceMint]: [
      { asset: "cSOL", owed: 1.2, paid: 1.2 },
      { asset: "USDC", owed: 80, paid: 0 },
    ],
  },
};

export const MOCK_REDEEM_OVERLAY: Record<string, Pick<CoinRedeem, "escrowUsdc" | "treasuryUsdcAvailable">> = {
  [solaceMint]: { escrowUsdc: 300, treasuryUsdcAvailable: 10 },
};

export function emptyRedeemLegs(): RedeemLeg[] {
  return [
    { asset: "cSOL", owed: 0, paid: 0 },
    { asset: "USDC", owed: 0, paid: 0 },
  ];
}
