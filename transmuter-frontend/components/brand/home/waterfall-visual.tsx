export function WaterfallVisual() {
  return (
    <div className="waterfall-visual" data-stage="0" data-waterfall-visual="">
      <div className="wf-background-grid" />
      <div className="wf-core-line" />
      <div className="wf-progress-line" />
      <div className="wf-pulse wf-pulse-top" />
      <div className="wf-pulse wf-pulse-bottom" />
      <Stage number="01" stage="launch" kicker="LAUNCH" label="Token starts live" />
      <Stage number="02" stage="build" kicker="BUILD" label="Scheduled tranches release" />
      <Stage number="03" stage="trade" kicker="TRADE" label="Backing grows with activity" />
      <Stage number="04" stage="recover" kicker="RECOVER" label="Defined ending" />
      <div className="wf-launch-branches">
        <div className="wf-branch branch-treasury"><small>RESERVE</small><strong>Isolated treasury</strong></div>
        <div className="wf-branch branch-liquidity"><small>MARKET DEPTH</small><strong>Contract-owned liquidity</strong></div>
        <div className="wf-branch branch-escrow"><small>RUNWAY</small><strong>Optional escrow</strong></div>
      </div>
      <div className="wf-branch-lines wf-branch-line-one" />
      <div className="wf-branch-lines wf-branch-line-two" />
      <div className="wf-branch-lines wf-branch-line-three" />
      <div className="wf-build-controls">
        <span>Unlocks automatically</span>
        <span>Pause</span>
        <span>Unpause</span>
        <span>Advance next tranche</span>
      </div>
      <div className="wf-trade-streams">
        <div className="wf-trade-pill pill-a">Transactions feed reserves</div>
        <div className="wf-trade-pill pill-b">Minting adds backing directly</div>
      </div>
      <div className="wf-underlayer">
        <div className="wf-underlayer-item"><small>RESERVE ASSET</small><strong>cSOL / cBTC</strong></div>
        <div className="wf-underlayer-link">→</div>
        <div className="wf-underlayer-item"><small>FINAL FALLBACK</small><strong>Tokenized gold contingency</strong></div>
      </div>
      <div className="wf-recovery-payout">
        <div className="wf-recovery-sources">
          <span>Treasury</span>
          <span>Liquidity</span>
          <span>Unspent escrow</span>
        </div>
        <div className="wf-recovery-arrow" />
        <div className="wf-holders">
          <i />
          <i />
          <i />
          <b>Pro rata to holders</b>
        </div>
      </div>
    </div>
  );
}

function Stage({ number, stage, kicker, label }: { number: string; stage: string; kicker: string; label: string }) {
  return (
    <div className={`wf-stage wf-stage-${stage}${number === "01" ? " is-active" : ""}`}>
      <span className="wf-stage-number">{number}</span>
      <div className="wf-stage-copy">
        <small>{kicker}</small>
        <strong>{label}</strong>
      </div>
    </div>
  );
}
