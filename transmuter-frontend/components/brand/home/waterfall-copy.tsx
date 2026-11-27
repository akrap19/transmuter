const steps = [
  {
    index: "01",
    eyebrow: "LAUNCH",
    title: "The token starts with something underneath it.",
    body: "After a 10-minute public countdown, the pools are seeded and claims open in one step. Escrow is optional; if used, its schedule is fixed before trading.",
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
    body: "Mint to Scale is paid in USDC, with 0.25% on top. Up to half of each mint pairs into the pools; the rest buys the basket.",
  },
  {
    index: "04",
    eyebrow: "END OF LIFE",
    title: "The ending is already written.",
    body: "After a 30-day vote and a 48-hour wait, unvested team tokens burn, investor tokens never burn, unspent escrow comes back as USDC, the pools unwind, the fee is taken, and what is left is paid out in the assets.",
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
