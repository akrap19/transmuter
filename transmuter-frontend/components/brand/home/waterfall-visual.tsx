export function WaterfallVisual() {
  return (
    <div className="waterfall-visual" data-stage="0" data-waterfall-visual="">
      <div className="wf-background-grid" />
      <div className="wf-core-line" />
      <div className="wf-progress-line" />
      <div className="wf-pulse wf-pulse-top" />
      <div className="wf-pulse wf-pulse-bottom" />
      <Stage number="01" stage="launch" kicker="LAUNCH" label="Pools seed, claims open" />
      <Stage number="02" stage="build" kicker="BUILD" label="Scheduled tranches release" />
      <Stage number="03" stage="trade" kicker="TRADE" label="Backing grows with activity" />
      <Stage number="04" stage="recover" kicker="END OF LIFE" label="Defined ending" />
      <div className="wf-launch-branches">
        <div className="wf-branch branch-treasury"><small>RESERVE</small><strong>Isolated treasury</strong></div>
        <div className="wf-branch branch-liquidity"><small>MARKET DEPTH</small><strong>Pools nobody can pull or drain</strong></div>
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
        <div className="wf-trade-pill pill-b">Mint to Scale buys the basket</div>
      </div>
      <div className="wf-underlayer">
        <div className="wf-underlayer-item"><small>RESERVE ASSETS</small><strong>BTC · SOL · USDC</strong></div>
      </div>
      <div className="wf-recovery-payout">
        <div className="wf-recovery-sources">
          <span>Treasury basket</span>
          <span>Pools&apos; cash</span>
          <span>Unspent escrow</span>
        </div>
        <div className="wf-recovery-arrow" />
        <div className="wf-holders">
          <i />
          <i />
          <i />
          <b>Holders redeem pro rata</b>
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
