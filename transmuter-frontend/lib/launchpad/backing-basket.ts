/**
 * Backing basket: how a launch's treasury backing is split across reserve assets.
 *
 * The creator picks a weight per asset (SOL / BTC / Gold / S&P). Each slider
 * moves on its own. The basket is valid only when the weights sum to 100%.
 *
 * SOL and BTC settle into real cToken reserves. Gold and S&P each have one fixed
 * fee address: their share of the cToken reserve fee is sent there.
 */

export type BackingAsset = "SOL" | "BTC" | "GOLD" | "SPX";

export type BackingLeg = { asset: BackingAsset; weight: number };

/** How a leg is held on-chain. cTokens are live reserves; allocation vaults hold earmarked funds. */
export type BackingSettlement = "ctoken" | "allocation";

export type BackingAssetMeta = {
  asset: BackingAsset;
  /** Full name shown in the wizard. */
  label: string;
  /** Short ticker. */
  symbol: string;
  /** The reserve token name (cSOL, cBTC, …). */
  cToken: string;
  /** Glyph for the asset card. */
  icon: string;
  settlement: BackingSettlement;
  /** On-chain basket leg discriminant. Must match the Factory `BackingAssetKind`. */
  kind: number;
  /** Fixed address that receives this asset's share of the cToken reserve fee. */
  feeAddress: string | null;
};

/**
 * Fixed destinations for the Gold and S&P shares of the cToken reserve fee.
 * Factory PDAs: seeds `["backing_fee", "gold"]` and `["backing_fee", "spx"]`
 * under program `5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV`.
 */
export const GOLD_FEE_ADDRESS = "aXzFgSUX4522y575a8UkR3bv4EY1QRHpt1oJPvTS4vZ";
export const SPX_FEE_ADDRESS = "FzEq621CLhNb5sS92sMYUakTyrWfbmZbDDKtUGHKtR7P";

export const BACKING_ASSETS: readonly BackingAssetMeta[] = [
  { asset: "SOL", label: "Solana", symbol: "SOL", cToken: "cSOL", icon: "◎", settlement: "ctoken", kind: 0, feeAddress: null },
  { asset: "BTC", label: "Bitcoin", symbol: "BTC", cToken: "cBTC", icon: "₿", settlement: "ctoken", kind: 1, feeAddress: null },
  { asset: "GOLD", label: "Gold", symbol: "XAU", cToken: "cGOLD", icon: "Au", settlement: "allocation", kind: 2, feeAddress: GOLD_FEE_ADDRESS },
  { asset: "SPX", label: "S&P 500", symbol: "SPX", cToken: "cSPX", icon: "S&P", settlement: "allocation", kind: 3, feeAddress: SPX_FEE_ADDRESS },
] as const;

export const DEFAULT_BACKING_BASKET: BackingLeg[] = [
  { asset: "SOL", weight: 100 },
  { asset: "BTC", weight: 0 },
  { asset: "GOLD", weight: 0 },
  { asset: "SPX", weight: 0 },
];

export function assetMeta(asset: BackingAsset): BackingAssetMeta {
  const meta = BACKING_ASSETS.find((m) => m.asset === asset);
  if (!meta) throw new Error(`unknown backing asset ${asset}`);
  return meta;
}

export function basketTotal(basket: readonly BackingLeg[]): number {
  return basket.reduce((sum, leg) => sum + leg.weight, 0);
}

/** Legs with a positive weight, in basket order. */
export function activeLegs(basket: readonly BackingLeg[]): BackingLeg[] {
  return basket.filter((leg) => leg.weight > 0);
}

/** Set one leg's weight. Other legs stay as they are. */
export function setBasketWeight(
  basket: readonly BackingLeg[],
  asset: BackingAsset,
  rawWeight: number,
): BackingLeg[] {
  const weight = clampPct(rawWeight);
  return basket.map((leg) => (leg.asset === asset ? { ...leg, weight } : leg));
}

export function basketIsComplete(basket: readonly BackingLeg[]): boolean {
  return basketTotal(basket) === 100;
}

/**
 * The cToken that backs the Factory `backing_ctoken` plumbing. SOL and BTC are
 * the only live cToken reserves, so the primary is the heavier of those two
 * (SOL when neither carries weight). Gold/S&P ride along as allocation legs.
 */
export function primaryBackingAsset(basket: readonly BackingLeg[]): BackingAsset {
  const ctokenLegs = basket.filter((leg) => assetMeta(leg.asset).settlement === "ctoken");
  const best = ctokenLegs.reduce<BackingLeg | null>(
    (top, leg) => (top == null || leg.weight > top.weight ? leg : top),
    null,
  );
  return best && best.weight > 0 ? best.asset : "SOL";
}

/** The other live cToken, used for the Factory fallback listing (must differ from primary). */
export function fallbackBackingAsset(basket: readonly BackingLeg[]): BackingAsset {
  return primaryBackingAsset(basket) === "SOL" ? "BTC" : "SOL";
}

/** This leg's slice of the cToken reserve fee, in the same percent units as that fee. */
export function allocatedReserveFee(weight: number, reserveFeePct: number): number {
  return Number(((reserveFeePct * weight) / 100).toFixed(4));
}

function clampPct(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
