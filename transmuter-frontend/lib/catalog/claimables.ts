import { evaluateEscrowDraw } from "./escrow";
import { unpaidLegs } from "./redeem";
import { evaluateVestingClaim } from "./vesting";
import type { Claimable, CoinDetail } from "./types";

export function claimablesFromCoin(coin: CoinDetail, wallet: string, now: number): Claimable[] {
  const rows: Claimable[] = [];
  const base = { mint: coin.mint, name: coin.name, symbol: coin.symbol };

  if (coin.vesting) {
    const claim = evaluateVestingClaim(coin.vesting, wallet, now);
    if (claim.ok) rows.push({ ...base, kind: "vesting", amount: claim.amount, asset: coin.symbol });
  }

  if (coin.redeem) {
    for (const leg of unpaidLegs(coin.redeem)) {
      rows.push({ ...base, kind: "redemption", amount: leg.remaining, asset: leg.asset });
    }
  }

  if (coin.escrow) {
    const draw = evaluateEscrowDraw(coin.escrow, wallet, now);
    if (draw.ok) rows.push({ ...base, kind: "escrow", amount: draw.amount, asset: "USDC" });
  }

  return rows;
}
