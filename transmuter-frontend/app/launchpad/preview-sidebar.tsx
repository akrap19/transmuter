"use client";

import { computeOverflowFromState } from "@/lib/launchpad/overflow-calc";
import { formatMcap, formatNum, formatPrice } from "@/lib/launchpad/launch-solver";
import { useLaunchpad } from "./launchpad-context";

const SALE_LABELS = {
  fixed: "Fixed price",
  dutch: "Reverse Dutch",
  overflow: "Overflow pool",
} as const;

export function PreviewSidebar() {
  const { state, launchSolve: L } = useLaunchpad();
  const name = state.tokenName || "Your Token";
  const ticker = state.tokenTicker || "TICKER";
  const supply = parseFloat(state.tokenSupply);
  const overflow =
    state.saleType === "overflow" ? computeOverflowFromState(state) : null;

  let price = L?.feasible ? L.price : undefined;
  let mcap = price && supply ? price * supply : null;

  if (state.saleType === "overflow" && overflow?.listPrice && overflow.listPrice !== "—") {
    const numericPrice = parseFloat(overflow.listPrice.replace(/^\$/, ""));
    if (!isNaN(numericPrice)) {
      price = numericPrice;
      mcap = supply && !isNaN(supply) ? numericPrice * supply : null;
    }
  }

  return (
    <div className="sidebar">
      <div className="preview-panel">
        <div className="preview-title">Live preview</div>
        <div className="preview-token-header">
          <div className="preview-token-icon">
            {state.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="preview-token-preview" src={state.logoUrl} alt="" />
            ) : (
              (ticker.slice(0, 2) || "TK")
            )}
          </div>
          <div>
            <div className="preview-token-name">{name}</div>
            <div className="preview-token-ticker">${ticker} • Reinforced</div>
          </div>
        </div>

        <PreviewStat label="Initial Price" value={price ? `$${formatPrice(price)}` : "-"} cyan />
        <PreviewStat label="Sale Type" value={SALE_LABELS[state.saleType]} gold />
        <PreviewStat label="Total Supply" value={supply && !isNaN(supply) ? formatNum(supply) : "-"} />
        <PreviewStat
          label="Implied MCP"
          value={
            state.saleType === "overflow" && overflow?.mcp
              ? overflow.mcp
              : mcap
                ? `$${formatMcap(mcap)}`
                : "-"
          }
          gold
        />
        <PreviewStat label="TX Fee" value={`${state.fees.totalFee.toFixed(2)}%`} />
        <PreviewStat label="Backing" value={state.selectedCToken.name} green />

        <div className="preview-chain">
          <div className="preview-chain-title">Collateral Chain</div>
          <ChainNode pill={ticker || "TOKEN"} pillClass="cn-gold" desc="backed by" />
          <ChainNode pill={state.selectedCToken.name} pillClass="cn-cyan" desc="backed by" />
          <ChainNode pill={state.selectedCToken.eol} pillClass="cn-green" desc="backed by" />
          <div className="chain-node">
            <span className="cn-pill cn-gold-pale">🥇 Tokenized Gold</span>
          </div>
        </div>
      </div>

      <div className="panel benefits-panel">
        <div className="panel-title benefits-title">Reinforced token benefits</div>
        <div className="benefits-list">
          ✓ Non-custodial treasury<br />
          ✓ No creator access, ever<br />
          ✓ Treasury grows with every TX<br />
          ✓ Backing per token only grows<br />
          ✓ Tokenized gold contingency<br />
          ✓ Built-in end-of-life plan<br />
          ✓ Community governance<br />
          ✓ Anti-rug architecture
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  cyan,
  gold,
  green,
}: {
  label: string;
  value: string;
  cyan?: boolean;
  gold?: boolean;
  green?: boolean;
}) {
  const cls = cyan ? "cyan" : gold ? "gold" : green ? "green" : "";
  return (
    <div className="preview-stat">
      <span className="preview-stat-label">{label}</span>
      <span className={`preview-stat-value${cls ? ` ${cls}` : ""}`}>{value}</span>
    </div>
  );
}

function ChainNode({
  pill,
  pillClass,
  desc,
}: {
  pill: string;
  pillClass: string;
  desc?: string;
}) {
  return (
    <div className="chain-node">
      <span className={`cn-pill ${pillClass}`}>{pill}</span>
      {desc && (
        <>
          <span className="cn-arrow">→</span>
          <span className="cn-desc">{desc}</span>
        </>
      )}
    </div>
  );
}
