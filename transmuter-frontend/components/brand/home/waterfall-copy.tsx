const steps = [
  {
    index: "01",
    eyebrow: "LAUNCH",
    title: "The token starts with something underneath it.",
    body: "An isolated treasury and contract-owned liquidity sit beneath the token from launch. Escrow is optional; if used, its schedule is fixed before trading.",
  },
  {
    index: "02",
    eyebrow: "BUILD",
    title: "Runway releases automatically.",
    body: "If escrow is used, tranches unlock on schedule without a vote. Holders can pause, resume or advance the next tranche, but nobody can rewrite the schedule.",
  },
  {
    index: "03",
    eyebrow: "TRADE",
    title: "Activity leaves something behind.",
    body: "Transactions and minting add backing while the token is active. A minter pays into the reserve and receives tokens in return.",
  },
  {
    index: "04",
    eyebrow: "RECOVER",
    title: "The ending is already written.",
    body: "After governance approves recovery, liquidity and unspent escrow consolidate into the treasury, unsold and unvested tokens burn, and reserves distribute pro rata to holders.",
  },
];

export function WaterfallCopy() {
  return (
    <div className="waterfall-copy">
      {steps.map((step, index) => (
        <article className={index === 0 ? "wf-step is-active" : "wf-step"} data-wf-step={index} key={step.index}>
          <div className="wf-step-index">{step.index}</div>
          <div className="wf-step-body">
            <p className="eyebrow">{step.eyebrow}</p>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
