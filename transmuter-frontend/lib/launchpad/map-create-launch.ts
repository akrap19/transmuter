import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE } from "./fee-calculator";
import { fallbackCtoken } from "./ctokens";
import { solveFromState } from "./launch-solver";
import { factoryCtokenPda } from "@/lib/solana/programs/factory";
import type { CToken, LaunchpadState, VestingPreset } from "./types";

export const TOKEN_DECIMALS = 9;
export const USDC_DECIMALS = 6;
export const DEFAULT_GOVERNED_MINT_PCT_BPS = 1000;
export const LP_SPLIT_BPS = 5000;
export const RESERVE_MINT_DURATION_SECS = 6 * 3600;
export const LIQ_VOTE_WINDOW_SECS = 14 * 24 * 3600;

const SALE_WINDOW_SECS: Record<string, number> = {
  "2 days": 2 * 24 * 3600,
  "1 week": 7 * 24 * 3600,
  "2 weeks": 14 * 24 * 3600,
  "1 month": 30 * 24 * 3600,
  "60 days": 60 * 24 * 3600,
};

const VESTING_KIND: Record<Exclude<VestingPreset, "Custom">, number> = {
  None: 0,
  "6 Month Cliff": 1,
  "12 Month Linear": 2,
  "24 Month Linear": 3,
  "6M Cliff + 18M Linear": 4,
};

export type MapCreateLaunchInput = {
  state: LaunchpadState;
  nowSeconds: number;
  teamRecipient: string;
  daoContract: string;
  whitelist: CToken[];
};

export type MappedCreateLaunchParams = {
  name: string;
  symbol: string;
  decimals: number;
  saleType: number;
  salePrice: BN;
  targetRaise: BN;
  totalSupply: BN;
  saleBps: number;
  lpBps: number;
  lpSolShareBps: number;
  lpUsdcShareBps: number;
  teamBps: number;
  investorBps: number;
  daoBps: number;
  escrowFundingNeed: BN;
  saleEnd: BN;
  governedMintPctBps: number;
  reserveMintActivatePct: BN;
  reserveMintDeactivatePct: BN;
  reserveMintDurationSecs: BN;
  reserveMintVoteWindowSecs: BN;
  liqVoteWindowSecs: BN;
  convertChunk: BN;
  transferFeeBps: number;
  feeLpBps: number;
  feeTreasuryBps: number;
  feeCtokenBps: number;
  feeProtocolBps: number;
  feeCreatorBps: number;
  feeBurnBps: number;
  forfeitDest: number;
  vestingSchedule: number;
};

export type MappedCreateLaunchAccounts = {
  backingCtoken: PublicKey;
  fallbackCtoken: PublicKey;
  backingListing: PublicKey;
  fallbackListing: PublicKey;
  teamRecipient: PublicKey;
  daoContract: PublicKey;
};

export function mapLaunchpadToCreateLaunch(input: MapCreateLaunchInput): {
  params: MappedCreateLaunchParams;
  accounts: MappedCreateLaunchAccounts;
} {
  const { state, whitelist } = input;
  const name = state.tokenName.trim();
  const symbol = state.tokenTicker.trim().toUpperCase();
  if (!name || !symbol) {
    throw new Error("token name and ticker are required");
  }
  if (name.length > 32 || symbol.length > 12) {
    throw new Error("token name or ticker exceeds on-chain length");
  }
  if (state.saleType !== "fixed") {
    throw new Error("Factory only accepts FIXED sales");
  }
  if (state.vesting === "Custom") {
    throw new Error("custom vesting is not a chain schedule");
  }

  const saleBps = pctToBps(state.allocPublic);
  const lpBps = pctToBps(state.allocLP);
  const teamBps = pctToBps(state.allocTeam);
  const investorBps = state.showInvestors ? pctToBps(state.allocInvestors) : 0;
  const daoBps = state.toggles.daoAirdrop ? pctToBps(state.daoAirdropPct) : 0;
  if (investorBps > 0) {
    throw new Error("investor allocation is not enabled on-chain");
  }
  if (saleBps + lpBps + teamBps + investorBps + daoBps !== 10_000) {
    throw new Error("allocations must sum to 100%");
  }

  const solve = solveFromState(state);
  if (!solve?.feasible || solve.R == null || solve.supply == null) {
    throw new Error("launch is not feasible");
  }

  const windowSecs = SALE_WINDOW_SECS[state.saleWindow];
  if (windowSecs == null) {
    throw new Error(`unknown sale window ${state.saleWindow}`);
  }

  const totalSupply = decimalToAtomic(state.tokenSupply, TOKEN_DECIMALS);
  const targetFromUi = numberToAtomic(solve.R, USDC_DECIMALS);
  const saleTokens = (totalSupply * BigInt(saleBps)) / BigInt(10_000);
  if (saleTokens === BigInt(0) || totalSupply === BigInt(0)) {
    throw new Error("supply and sale allocation must be positive");
  }
  const salePrice = (targetFromUi * BigInt(10) ** BigInt(TOKEN_DECIMALS)) / saleTokens;
  if (salePrice === BigInt(0)) {
    throw new Error("sale price rounds to zero");
  }
  const targetRaise = (saleTokens * salePrice) / BigInt(10) ** BigInt(TOKEN_DECIMALS);

  const feeLpBps = pctToBps(state.fees.lpFee);
  const feeTreasuryBps = pctToBps(state.fees.treasuryFee);
  const feeCtokenBps = pctToBps(CTOKEN_RESERVE_FEE);
  const feeProtocolBps = pctToBps(PROTOCOL_FEE);
  const feeCreatorBps = state.toggles.creatorFee ? pctToBps(state.fees.creatorFee) : 0;
  const feeBurnBps = state.toggles.burnFee ? pctToBps(state.fees.burnFee) : 0;
  const transferFeeBps =
    feeLpBps + feeTreasuryBps + feeCtokenBps + feeProtocolBps + feeCreatorBps + feeBurnBps;

  const backing = resolveSelected(state.selectedCToken, whitelist);
  const fallback = fallbackCtoken(backing, whitelist);
  if (!backing.mint || !fallback.mint) {
    throw new Error("cToken whitelist mints are not configured");
  }
  const backingCtoken = new PublicKey(backing.mint);
  const fallbackCtokenPk = new PublicKey(fallback.mint);

  return {
    params: {
      name,
      symbol,
      decimals: TOKEN_DECIMALS,
      saleType: 0,
      salePrice: bn(salePrice),
      targetRaise: bn(targetRaise),
      totalSupply: bn(totalSupply),
      saleBps,
      lpBps,
      lpSolShareBps: LP_SPLIT_BPS,
      lpUsdcShareBps: LP_SPLIT_BPS,
      teamBps,
      investorBps,
      daoBps,
      escrowFundingNeed: bn(decimalToAtomic(state.escrowNeed || "0", USDC_DECIMALS)),
      saleEnd: bn(BigInt(input.nowSeconds + windowSecs)),
      governedMintPctBps: DEFAULT_GOVERNED_MINT_PCT_BPS,
      reserveMintActivatePct: bn(BigInt(state.autoMintTrigger)),
      reserveMintDeactivatePct: bn(BigInt(state.autoMintDeactivate)),
      reserveMintDurationSecs: bn(BigInt(RESERVE_MINT_DURATION_SECS)),
      reserveMintVoteWindowSecs: bn(BigInt(state.voteWindow * 3600)),
      liqVoteWindowSecs: bn(BigInt(LIQ_VOTE_WINDOW_SECS)),
      convertChunk: bn(BigInt(0)),
      transferFeeBps,
      feeLpBps,
      feeTreasuryBps,
      feeCtokenBps,
      feeProtocolBps,
      feeCreatorBps,
      feeBurnBps,
      forfeitDest: 0,
      vestingSchedule: VESTING_KIND[state.vesting],
    },
    accounts: {
      backingCtoken,
      fallbackCtoken: fallbackCtokenPk,
      backingListing: factoryCtokenPda(backingCtoken),
      fallbackListing: factoryCtokenPda(fallbackCtokenPk),
      teamRecipient: new PublicKey(input.teamRecipient),
      daoContract: new PublicKey(input.daoContract),
    },
  };
}

function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

function bn(n: bigint | number): BN {
  return new BN(n.toString());
}

function resolveSelected(selected: CToken, whitelist: CToken[]): CToken {
  return whitelist.find((token) => token.name === selected.name) ?? selected;
}

export function decimalToAtomic(raw: string, decimals: number): bigint {
  const trimmed = raw.trim();
  if (!trimmed) return BigInt(0);
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  if (!/^\d+$/.test(whole) || (fracRaw !== "" && !/^\d+$/.test(fracRaw))) {
    throw new Error(`invalid decimal ${raw}`);
  }
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(frac || "0");
}

export function numberToAtomic(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * 10 ** decimals));
}
