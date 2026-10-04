/** A failed or superseded chain read must not replace the snapshot already on screen. */
export function settleChainRead<T>(current: T | null, next: T | null, request: number, latest: number): T | null {
  if (request !== latest) return current;
  return next ?? current;
}

export type SaleSectionState = "ready" | "loading" | "hidden";

/** A sale launch with no chain snapshot is still loading, not missing. */
export function saleSectionState(status: string, hasSale: boolean): SaleSectionState {
  if (hasSale) return "ready";
  if (status === "sale") return "loading";
  return "hidden";
}

const TREASURY_STATUSES = new Set(["wired", "sale", "active", "voided", "liquidating"]);

/** Treasury belongs on a wired launch. A created launch has no treasury account yet. */
export function treasurySectionState(status: string, settled: boolean, hasTreasury: boolean): SaleSectionState {
  if (hasTreasury) return "ready";
  if (!TREASURY_STATUSES.has(status)) return "hidden";
  if (!settled) return "loading";
  return "hidden";
}

/** Deposit figures belong to a wallet only after that wallet was part of the read. */
export function depositReadMatches(wallet: string | null, readWallet: string | null): boolean {
  if (wallet == null) return true;
  return readWallet === wallet;
}
