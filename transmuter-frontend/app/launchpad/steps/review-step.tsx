"use client";

import { CTOKEN_RESERVE_FEE, PROTOCOL_FEE } from "@/lib/launchpad/fee-calculator";
import { formatMcap, formatNum, formatPrice } from "@/lib/launchpad/launch-solver";
import { useLaunchpad } from "../launchpad-context";

export function ReviewStep() {
  const { state, goToStep, dispatch, launchSolve: L } = useLaunchpad();
  const price = L?.feasible ? L.price : undefined;
  const supply = parseFloat(state.tokenSupply);

  function handleLaunch() {
    if (!state.tokenName || !state.tokenTicker) {
      alert("Please fill in Token Name and Ticker before launching.");
      goToStep(1);
      return;
    }
    dispatch({ type: "LAUNCH" });
  }

  const pubLp = L?.lpFrac ? (L.lpFrac * 100).toFixed(0) : "—";
  const pubTreas = L?.treasFrac ? (L.treasFrac * 100).toFixed(0) : "—";
  const pubRunway = L?.escrowFrac ? (L.escrowFrac * 100).toFixed(0) : "—";

  return (
    <div className={`step-panel panel${state.currentStep === 5 ? " active" : ""}`}>
      <div className="panel-title"><div className="dot" />Review & Launch</div>
      <div className="launch-warning">
        <strong>⚠️ Before you launch:</strong> Deploying opens your sale, it does not distribute
        tokens. Deposits stay withdrawable until the sale concludes; if the raise can&apos;t fund
        the backing minimums (treasury 10% ask in this wizard; on-chain accept 8% of MCP
        after conversion, combined 18%), the launch voids and
        every deposit is reclaimable. Once finalized, the treasury is fully non-custodial: no
        human, including you, can access it. End of life liquidation requires a community vote.
      </div>

      <div className="review-grid">
        <ReviewBlock title="Token Identity">
          <ReviewRow label="Name" value={state.tokenName || "—"} />
          <ReviewRow label="Ticker" value={`$${state.tokenTicker || "—"}`} cyan />
          <ReviewRow label="DAO Airdrop" value={state.toggles.daoAirdrop ? `Yes - ${state.daoAirdropPct}% of supply` : "No"} />
          <ReviewRow label="Vesting" value={state.vesting} />
        </ReviewBlock>
        <ReviewBlock title="Tokenomics">
          <ReviewRow label="Total Supply" value={supply ? formatNum(supply) : "—"} />
          <ReviewRow label="Initial Price" value={price ? `$${formatPrice(price)}` : "—"} />
          <ReviewRow label="Implied MCP" value={price && supply ? `$${formatMcap(price * supply)}` : "—"} cyan />
          <ReviewRow label="Public Sale → LP" value={`${pubLp}% of proceeds`} />
          <ReviewRow label="Public Sale → Treasury" value={`${pubTreas}% of proceeds`} gold />
          <ReviewRow label="Public Sale → Runway" value={`${pubRunway}% of proceeds`} />
        </ReviewBlock>
        <ReviewBlock title="Backing">
          <ReviewRow label="Backing cToken" value={state.selectedCToken.name} gold />
          <ReviewRow label="Last Resort" value={`Isolated gold reserve (${state.selectedCToken.name})`} green />
          <ReviewRow label="Reserve Mint Band" value={`open <${state.autoMintTrigger}% / close ${state.autoMintDeactivate}% (6h continuous)`} gold />
          <ReviewRow label="Gov. Vote Window" value={`${state.voteWindow}h`} />
          <ReviewRow label="Sale Window" value={state.saleWindow} />
        </ReviewBlock>
        <ReviewBlock title="Fee Structure">
          <ReviewRow label="Total TX Fee" value={`${state.fees.totalFee.toFixed(2)}%`} cyan />
          <ReviewRow label="→ LP" value={`${state.fees.lpFee.toFixed(2)}%`} />
          <ReviewRow label="→ Treasury" value={`${state.fees.treasuryFee.toFixed(2)}%`} />
          <ReviewRow label="→ cToken reserve" value={`${CTOKEN_RESERVE_FEE.toFixed(2)}%`} />
          <ReviewRow label="→ Protocol" value={`${PROTOCOL_FEE.toFixed(2)}%`} pink />
          <ReviewRow label="Burn Fee" value={state.toggles.burnFee ? `${state.fees.burnFee.toFixed(2)}%` : "Off"} />
          <ReviewRow label="Creator Fee" value={state.toggles.creatorFee ? `${state.fees.creatorFee.toFixed(2)}%` : "Off"} />
        </ReviewBlock>
      </div>

      <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" className="btn btn-outline" onClick={() => goToStep(4)}>← Back</button>
        <button type="button" className="btn btn-launch" onClick={handleLaunch}>🚀 Deploy Token</button>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="review-block">
      <div className="review-block-title">{title}</div>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  cyan,
  gold,
  green,
  pink,
}: {
  label: string;
  value: string;
  cyan?: boolean;
  gold?: boolean;
  green?: boolean;
  pink?: boolean;
}) {
  const color = cyan ? "var(--tm-cyan)" : gold ? "var(--tm-gold)" : green ? "var(--tm-green)" : pink ? "var(--tm-pink)" : undefined;
  return (
    <div className="review-item">
      <span className="review-item-label">{label}</span>
      <span className="review-item-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
