import type { ReserveMintStatus, TreasurySnapshot } from "./types";

export type TreasuryInput = {
  cTokenAmount: number;
  unconvertedUsdc: number;
  cTokenPriceUsd: number;
  circulatingSupply: number;
  reserveMint: ReserveMintStatus;
};

export function treasuryBackingUsd(input: Pick<TreasuryInput, "cTokenAmount" | "cTokenPriceUsd" | "unconvertedUsdc">) {
  return input.cTokenAmount * input.cTokenPriceUsd + input.unconvertedUsdc;
}

export function redemptionRatio(cTokenAmount: number, circulatingSupply: number) {
  if (circulatingSupply <= 0) return 0;
  return cTokenAmount / circulatingSupply;
}

export function buildTreasury(input: TreasuryInput): TreasurySnapshot {
  return {
    ...input,
    backingValueUsd: treasuryBackingUsd(input),
    redemptionRatio: redemptionRatio(input.cTokenAmount, input.circulatingSupply),
  };
}
