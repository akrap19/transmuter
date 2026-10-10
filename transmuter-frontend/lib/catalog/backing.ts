import { buildTreasury } from "./treasury";
import type { TreasurySnapshot } from "./types";

const SOL_SCALE = BigInt(1_000_000_000);
/** Matches the catalog reserve-mint yearly display. There is no on-chain mint counter. */
const RESERVE_MINT_YEARLY_CAP = 3;

export type BackingInput = {
  ctokenAtoms: bigint;
  unconvertedUsdcAtoms: bigint;
  solResidueLamports: bigint;
  oraclePrice: bigint;
  oracleExpo: number;
  circulatingAtoms: bigint;
  totalSupplyAtoms: bigint;
  salePriceAtoms: bigint;
  decimals: number;
  governedMintPctBps: number;
  pathAReady: boolean;
  pathBActivated: boolean;
};

export type BackingView = {
  treasury: TreasurySnapshot;
  backingRatioBps: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
};

/** SOL/USD as USDC atoms (6 dp). Same truncation as `oracle_to_usdc_6`. */
export function oracleToUsdcAtoms(price: bigint, expo: number): bigint | null {
  if (price <= BigInt(0)) return null;
  const exp = expo + 6;
  if (exp > 18 || exp < -18) return null;
  if (exp >= 0) return price * BigInt(10) ** BigInt(exp);
  return price / BigInt(10) ** BigInt(-exp);
}

/**
 * Backing in USD is cToken and leftover SOL marked at the oracle, plus unconverted USDC
 * (sale vault, treasury vault, and escrow). A missing oracle still counts the USDC.
 */
export function backingFromChain(input: BackingInput): BackingView {
  const solUsd = oracleToUsdcAtoms(input.oraclePrice, input.oracleExpo);
  const marked = solUsd == null ? BigInt(0) : ((input.ctokenAtoms + input.solResidueLamports) * solUsd) / SOL_SCALE;
  const backingAtoms = marked + input.unconvertedUsdcAtoms;
  const cTokenAmount = atomsToNumber(input.ctokenAtoms, 9);
  const circulatingSupply = atomsToNumber(input.circulatingAtoms, input.decimals);
  const treasury = buildTreasury({
    cTokenAmount,
    unconvertedUsdc: atomsToNumber(input.unconvertedUsdcAtoms, 6),
    cTokenPriceUsd: solUsd == null ? 0 : atomsToNumber(solUsd, 6),
    circulatingSupply,
    reserveMint: {
      pathAReady: input.pathAReady,
      pathBActivated: input.pathBActivated,
      governedPct: input.governedMintPctBps / 100,
      mintsThisYear: 0,
      yearlyCap: RESERVE_MINT_YEARLY_CAP,
    },
  });
  const fdvAtoms = usdcForTokens(input.totalSupplyAtoms, input.salePriceAtoms, input.decimals);
  // cToken cannot be marked without an oracle, so a ratio that ignored it would
  // understate a backed launch. USDC is already in dollars: a SOL residue with
  // no price must not blank that figure.
  const unpricedCtoken = solUsd == null && input.ctokenAtoms > BigInt(0);
  const priceUsd = input.salePriceAtoms > BigInt(0) ? atomsToNumber(input.salePriceAtoms, 6) : null;
  const capSupply = input.circulatingAtoms > BigInt(0) ? input.circulatingAtoms : input.totalSupplyAtoms;
  const marketCapAtoms = usdcForTokens(capSupply, input.salePriceAtoms, input.decimals);
  return {
    treasury: { ...treasury, backingValueUsd: atomsToNumber(backingAtoms, 6) },
    backingRatioBps:
      fdvAtoms > BigInt(0) && !unpricedCtoken ? Number((backingAtoms * BigInt(10_000)) / fdvAtoms) : null,
    priceUsd,
    marketCapUsd: priceUsd == null ? null : atomsToNumber(marketCapAtoms, 6),
  };
}

function usdcForTokens(tokens: bigint, salePrice: bigint, decimals: number): bigint {
  if (decimals < 0 || decimals > 18) return BigInt(0);
  return (tokens * salePrice) / BigInt(10) ** BigInt(decimals);
}

function atomsToNumber(atoms: bigint, decimals: number): number {
  return Number(atoms) / 10 ** decimals;
}
