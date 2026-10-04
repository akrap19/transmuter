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

const SECONDS_PER_DAY = 24 * 3600;
export const SALE_WINDOW_MIN_DAYS = 1;
export const SALE_WINDOW_MAX_DAYS = 60;

const VESTING_KIND: Record<Exclude<VestingPreset, "Custom">, number> = {
  None: 0,
  "6 Month Cliff": 1,
  "12 Month Linear": 2,
  "24 Month Linear": 3,
  "6M Cliff + 18M Linear": 4,
};

export const METADATA_URI_MAX_LEN = 200;

export type MapCreateLaunchInput = {
  state: LaunchpadState;
  nowSeconds: number;
  teamRecipient: string;
  daoContract: string;
  whitelist: CToken[];
  /** Off-chain Metaplex metadata JSON URI, stored on the Launch account. */
  metadataUri?: string;
};

export type MappedCreateLaunchParams = {
  name: string;
  symbol: string;
  metadataUri: string;
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

export class LaunchValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("\n"));
    this.name = "LaunchValidationError";
    this.issues = issues;
  }
}

/** Every wizard problem that blocks createLaunch. Independent checks all stay in the list. */
export function launchValidationIssues(state: LaunchpadState): string[] {
  const issues: string[] = [];
  const name = state.tokenName.trim();
  const symbol = state.tokenTicker.trim().toUpperCase();
  if (!name || !symbol) {
    issues.push("token name and ticker are required");
  }
  if (name.length > 32 || symbol.length > 12) {
    issues.push("token name or ticker exceeds on-chain length");
  }
  if (state.saleType !== "fixed") {
    issues.push("Factory only accepts FIXED sales");
  }
  if (state.vesting === "Custom") {
    issues.push("custom vesting is not a chain schedule");
  }

  const saleBps = pctToBps(state.allocPublic);
  const lpBps = pctToBps(state.allocLP);
  const teamBps = pctToBps(state.allocTeam);
  const investorBps = state.showInvestors ? pctToBps(state.allocInvestors) : 0;
  const daoBps = state.toggles.daoAirdrop ? pctToBps(state.daoAirdropPct) : 0;
  if (investorBps > 0) {
    issues.push("investor allocation is not enabled on-chain");
  }
  if (saleBps + lpBps + teamBps + investorBps + daoBps !== 10_000) {
    issues.push("allocations must sum to 100%");
  }

  const solve = solveFromState(state);
  if (!solve?.feasible || solve.R == null || solve.supply == null) {
    issues.push("launch is not feasible");
  }

  if (saleWindowSeconds(state.saleWindow) == null) {
    issues.push("sale window must be 1–60 days");
  }

  let totalSupply = BigInt(0);
  try {
    totalSupply = decimalToAtomic(state.tokenSupply, TOKEN_DECIMALS);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "invalid supply");
  }
  try {
    decimalToAtomic(state.escrowNeed || "0", USDC_DECIMALS);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "invalid escrow");
  }

  const saleTokens = (totalSupply * BigInt(saleBps)) / BigInt(10_000);
  if (saleTokens === BigInt(0) || totalSupply === BigInt(0)) {
    issues.push("supply and sale allocation must be positive");
  } else if (solve?.feasible && solve.R != null) {
    const salePrice = (numberToAtomic(solve.R, USDC_DECIMALS) * BigInt(10) ** BigInt(TOKEN_DECIMALS)) / saleTokens;
    if (salePrice === BigInt(0)) {
      issues.push("sale price rounds to zero");
    }
  }

  return issues;
}

/** Plain labels for the review step. One line under Deploy, not a stack of toasts. */
export function launchMissingLabels(state: LaunchpadState): string[] {
  const labels: string[] = [];
  const name = state.tokenName.trim();
  const symbol = state.tokenTicker.trim();
  if (!name) labels.push("token name");
  else if (name.length > 32) labels.push("a token name of 32 characters or fewer");
  if (!symbol) labels.push("token ticker");
  else if (symbol.length > 12) labels.push("a ticker of 12 characters or fewer");

  const supplyMissing = !state.tokenSupply.trim() || Number(state.tokenSupply) <= 0;
  if (supplyMissing) labels.push("token supply");

  for (const issue of launchValidationIssues(state)) {
    if (
      issue === "token name and ticker are required" ||
      issue === "token name or ticker exceeds on-chain length" ||
      issue === "supply and sale allocation must be positive" ||
      (issue === "launch is not feasible" && supplyMissing)
    ) {
      continue;
    }
    if (issue === "allocations must sum to 100%") {
      labels.push("an allocation that totals 100%");
      continue;
    }
    if (issue === "launch is not feasible") {
      labels.push("a raise this split can fund");
      continue;
    }
    if (issue === "Factory only accepts FIXED sales") {
      labels.push("a fixed-price sale");
      continue;
    }
    if (issue === "custom vesting is not a chain schedule") {
      labels.push("a supported vesting schedule");
      continue;
    }
    if (issue === "investor allocation is not enabled on-chain") {
      labels.push("investor allocation turned off");
      continue;
    }
    if (issue === "sale window must be 1–60 days") {
      labels.push("a sale window of 1–60 days");
      continue;
    }
    if (issue === "sale price rounds to zero") {
      labels.push("a sale price above zero");
      continue;
    }
    if (issue.startsWith("invalid decimal")) {
      labels.push("a valid supply and escrow amount");
      continue;
    }
    labels.push(issue);
  }

  return labels;
}

export function mapLaunchpadToCreateLaunch(input: MapCreateLaunchInput): {
  params: MappedCreateLaunchParams;
  accounts: MappedCreateLaunchAccounts;
} {
  const { state, whitelist } = input;
  const issues = launchValidationIssues(state);
  if (issues.length > 0) {
    throw new LaunchValidationError(issues);
  }
  if (state.vesting === "Custom") {
    throw new LaunchValidationError(["custom vesting is not a chain schedule"]);
  }

  const name = state.tokenName.trim();
  const symbol = state.tokenTicker.trim().toUpperCase();
  const saleBps = pctToBps(state.allocPublic);
  const lpBps = pctToBps(state.allocLP);
  const teamBps = pctToBps(state.allocTeam);
  const investorBps = state.showInvestors ? pctToBps(state.allocInvestors) : 0;
  const daoBps = state.toggles.daoAirdrop ? pctToBps(state.daoAirdropPct) : 0;
  const solve = solveFromState(state);
  if (!solve?.feasible || solve.R == null || solve.supply == null) {
    throw new LaunchValidationError(["launch is not feasible"]);
  }
  const windowSecs = saleWindowSeconds(state.saleWindow);
  if (windowSecs == null) {
    throw new LaunchValidationError(["sale window must be 1–60 days"]);
  }

  const totalSupply = decimalToAtomic(state.tokenSupply, TOKEN_DECIMALS);
  const targetFromUi = numberToAtomic(solve.R, USDC_DECIMALS);
  const saleTokens = (totalSupply * BigInt(saleBps)) / BigInt(10_000);
  const salePrice = (targetFromUi * BigInt(10) ** BigInt(TOKEN_DECIMALS)) / saleTokens;
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

  const metadataUri = input.metadataUri ?? "";
  if (metadataUri.length > METADATA_URI_MAX_LEN) {
    throw new Error(`metadata URI exceeds ${METADATA_URI_MAX_LEN} chars`);
  }

  return {
    params: {
      name,
      symbol,
      metadataUri,
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

/** Days in the wizard (decimals allowed) to whole seconds, inside the 1–60 day chain window. */
export function saleWindowSeconds(raw: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw.trim());
  if (!match) return null;
  const whole = BigInt(match[1]);
  const frac = match[2] ?? "";
  if (whole < BigInt(SALE_WINDOW_MIN_DAYS) || whole > BigInt(SALE_WINDOW_MAX_DAYS)) return null;
  if (whole === BigInt(SALE_WINDOW_MAX_DAYS) && /[1-9]/.test(frac)) return null;

  const day = BigInt(SECONDS_PER_DAY);
  let fracSecs = BigInt(0);
  if (frac) {
    const scale = BigInt(10) ** BigInt(frac.length);
    fracSecs = (BigInt(frac) * day + scale / BigInt(2)) / scale;
    if (fracSecs >= day) fracSecs = day - BigInt(1);
  }
  const secs = whole * day + fracSecs;
  const min = BigInt(SALE_WINDOW_MIN_DAYS) * day;
  const max = BigInt(SALE_WINDOW_MAX_DAYS) * day;
  if (secs < min || secs > max) return null;
  return Number(secs);
}

export function formatSaleWindow(raw: string): string {
  const secs = saleWindowSeconds(raw);
  if (secs == null) return "—";
  const days = Number(raw.trim());
  return `${days} ${days === 1 ? "day" : "days"}`;
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
