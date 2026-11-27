const layers = [
  {
    node: "token-node-project",
    coin: "token-coin-eol",
    mark: "BTC",
    sub: "SOL · USDC",
    kicker: "01 · TREASURY BASKET",
    title: "The creator's basket",
    body: "BTC, SOL and USDC, 1 to 5 of them, picked by the creator at launch and held by the token's own treasury.",
    flow: null,
  },
  {
    node: "token-node-reserve",
    coin: "token-coin-ctoken",
    mark: "$",
    sub: "USDC",
    kicker: "02 · NOT YET CONVERTED",
    title: "USDC waiting",
    body: "Revenue already collected and already redeemable, waiting to be swapped into the basket.",
    flow: null,
  },
  {
    node: "token-node-gold",
    coin: "token-coin-gold",
    mark: "P",
    sub: "POOLS",
    kicker: "03 · POOLS' CASH",
    title: "The pools' cash",
    body: "The cash side of the token's own pools, which nobody can pull or drain. It unwinds at end of life.",
    flow: null,
  },
];

export function ReserveStack() {
  return (
    <section className="stack-section section-shell reveal">
      <div className="stack-intro">
        <p className="eyebrow">THE RESERVES</p>
        <h2>What backs a token.</h2>
      </div>
      <div aria-label="What backs a token" className="token-stack">
        {layers.map((layer) => (
          <Layer key={layer.title} {...layer} />
        ))}
      </div>
      <p className="core-message">
        Each token keeps its own treasury, its own USDC waiting to be converted, and its own pools. An optional DAO
        pool is the only link between tokens. Holders own the pools and the treasury, and the contract manages them.
      </p>
    </section>
  );
}

function Layer({ node, coin, mark, sub, kicker, title, body }: (typeof layers)[number]) {
  return (
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
  );
}
