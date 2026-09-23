const layers = [
  {
    node: "token-node-project",
    coin: "token-coin-eol",
    mark: "EOL",
    sub: "01",
    kicker: "01 · PROJECT LAYER",
    title: "EOL token",
    body: "Backed by its own isolated treasury.",
    flow: "RECOVERS INTO",
  },
  {
    node: "token-node-reserve",
    coin: "token-coin-ctoken",
    mark: "c",
    sub: "SOL / BTC",
    kicker: "02 · RESERVE LAYER",
    title: "cSOL / cBTC",
    body: "Backed by its base asset and strengthened across the protocol.",
    flow: "FINAL FALLBACK",
  },
  {
    node: "token-node-gold",
    coin: "token-coin-gold",
    mark: "Au",
    sub: "TOKENIZED",
    kicker: "03 · CONTINGENCY LAYER",
    title: "Tokenized gold",
    body: "A reserve outside the project's own crypto risk, and the final fallback if the base asset itself were to fail.",
    flow: null,
  },
];

export function ReserveStack() {
  return (
    <section className="stack-section section-shell reveal">
      <div className="stack-intro">
        <p className="eyebrow">THE LAYER UNDERNEATH</p>
        <h2>A reserve asset needs its own contingency.</h2>
      </div>
      <div aria-label="Transmuter reserve layers" className="token-stack">
        {layers.map((layer) => (
          <Layer key={layer.title} {...layer} />
        ))}
      </div>
      <p className="core-message">
        Each project keeps its own treasury. Beneath it, the cToken layer adds a shared reserve asset with gold as
        contingency for base-asset failure.
      </p>
    </section>
  );
}

function Layer({ node, coin, mark, sub, kicker, title, body, flow }: (typeof layers)[number]) {
  return (
    <>
      <article className={`token-node ${node}`}>
        <div aria-hidden className={`token-coin ${coin}`}>
          <span className="token-coin-rim" />
          <span className="token-coin-orbit" />
          <span className="token-coin-core">
            <b>{mark}</b>
            <em>{sub}</em>
          </span>
        </div>
        <div className="token-node-copy">
          <small>{kicker}</small>
          <strong>{title}</strong>
          <p>{body}</p>
        </div>
      </article>
      {flow ? (
        <div aria-hidden className="token-flow">
          <span>{flow}</span>
          <i />
          <b>›</b>
        </div>
      ) : null}
    </>
  );
}
