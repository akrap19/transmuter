import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE } from "./fee-calculator";
import { formatMcap, formatNum, formatPrice } from "./launch-solver";
import { formatSaleWindow } from "./map-create-launch";
import { getForegoPct } from "./overflow-calc";
import { identityReviewSocials } from "./review-identity";
import type { LaunchSolveResult, LaunchpadState, SaleType } from "./types";

export type ReviewRowModel = {
  label: string;
  value: string;
  logo?: boolean;
  stacked?: boolean;
};

export type ReviewSectionModel = {
  title: string;
  rows: ReviewRowModel[];
};

const SALE_LABELS: Record<SaleType, string> = {
  fixed: "Fixed price",
  dutch: "Reverse Dutch",
  overflow: "Overflow pool",
};

function filled(raw: string): string {
  return raw.trim() || "—";
}

function usd(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) return "—";
  if (amount > 0 && amount < 0.01) return `$${formatPrice(amount)}`;
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pct(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

function identityRows(state: LaunchpadState): ReviewRowModel[] {
  return [
    { label: "Name", value: filled(state.tokenName) },
    { label: "Ticker", value: state.tokenTicker.trim() ? `$${state.tokenTicker.trim()}` : "—" },
    { label: "Description", value: filled(state.tokenDesc), stacked: true },
    { label: "Logo", value: state.logoFileName?.trim() || "—", logo: true },
    ...identityReviewSocials(state),
  ];
}

function tokenomicsRows(state: LaunchpadState, solve: LaunchSolveResult | null): ReviewRowModel[] {
  const supply = parseFloat(state.tokenSupply);
  const price = solve?.feasible ? solve.price : undefined;
  const rows: ReviewRowModel[] = [
    { label: "Liquidity pool", value: pct(state.allocLP) },
    { label: "Team", value: pct(state.allocTeam) },
    { label: "Public sale", value: pct(state.allocPublic) },
  ];
  if (state.showInvestors) {
    rows.push({ label: "Investors", value: pct(state.allocInvestors) });
  }
  rows.push(
    {
      label: "DAO Airdrop",
      value: state.toggles.daoAirdrop ? `Yes - ${pct(state.daoAirdropPct)} of supply` : "No",
    },
    { label: "Vesting", value: state.vesting },
    { label: "Total Supply", value: Number.isFinite(supply) && supply > 0 ? formatNum(supply) : "—" },
    { label: "Target Escrow Raise", value: usd(state.escrowNeed) },
    { label: "Treasury backing", value: `${pct(state.treasuryBackingPct)} of MCP` },
    { label: "Total Target Raise", value: usd(state.targetRaise) },
    { label: "Sale Window", value: formatSaleWindow(state.saleWindow) },
    { label: "Sale Type", value: SALE_LABELS[state.saleType] },
  );

  if (state.saleType === "dutch") {
    rows.push(
      { label: "Start Price", value: usd(state.dutchStartPrice) },
      {
        label: "Decay Step",
        value: state.dutchDecayRate.trim() ? `${state.dutchDecayRate.trim()}% / interval` : "—",
      },
      {
        label: "Decay Interval",
        value: state.dutchDecayInterval.trim() ? `${state.dutchDecayInterval.trim()} min` : "—",
      },
    );
  }

  if (state.saleType === "overflow") {
    rows.push(
      { label: "Raise Cap", value: state.overflowCap.trim() ? usd(state.overflowCap) : "No cap" },
      {
        label: "Forego Surplus Escrow",
        value: `${(getForegoPct(state.overflowForego) * 100).toFixed(0)}%`,
      },
    );
  }

  const proceeds = (fraction: number | undefined) =>
    fraction != null ? `${(fraction * 100).toFixed(0)}% of proceeds` : "—% of proceeds";

  rows.push(
    { label: "Initial Price", value: price ? `$${formatPrice(price)}` : "—" },
    { label: "Implied MCP", value: price && supply ? `$${formatMcap(price * supply)}` : "—" },
    { label: "Public Sale → LP", value: proceeds(solve?.lpFrac) },
    { label: "Public Sale → Treasury", value: proceeds(solve?.treasFrac) },
    { label: "Public Sale → Runway", value: proceeds(solve?.escrowFrac) },
  );
  return rows;
}

function backingRows(state: LaunchpadState): ReviewRowModel[] {
  return [
    { label: "Backing cToken", value: state.selectedCToken.name },
    {
      label: "Mint to Scale band",
      value: `${state.autoMintTrigger}% open · ${state.autoMintDeactivate}% close`,
    },
    { label: "Gov. Vote Window", value: `${state.voteWindow}h` },
  ];
}

function feeRows(state: LaunchpadState): ReviewRowModel[] {
  return [
    { label: "Total TX Fee", value: `${state.fees.totalFee.toFixed(2)}%` },
    { label: "→ LP", value: `${state.fees.lpFee.toFixed(2)}%` },
    { label: "→ Treasury", value: `${state.fees.treasuryFee.toFixed(2)}%` },
    { label: "→ cToken reserve", value: `${CTOKEN_RESERVE_FEE.toFixed(2)}%` },
    { label: "→ Protocol", value: `${PROTOCOL_FEE.toFixed(2)}%` },
    { label: "Burn Fee", value: state.toggles.burnFee ? `${state.fees.burnFee.toFixed(2)}%` : "Off" },
    { label: "Creator Fee", value: state.toggles.creatorFee ? `${state.fees.creatorFee.toFixed(2)}%` : "Off" },
  ];
}

export function launchReviewSections(
  state: LaunchpadState,
  solve: LaunchSolveResult | null,
): ReviewSectionModel[] {
  return [
    { title: "Token Identity", rows: identityRows(state) },
    { title: "Tokenomics", rows: tokenomicsRows(state, solve) },
    { title: "Backing", rows: backingRows(state) },
    { title: "Fee Structure", rows: feeRows(state) },
  ];
}
