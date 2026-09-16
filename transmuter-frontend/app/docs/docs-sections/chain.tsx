export function ChainSection() {
  return (
    <section id="chain">
      <h2>The Collateral Chain</h2>
      <div className="chainline">
        <span>EOL TOKEN</span>
        <i>&rsaquo;</i>
        <span>cBTC / cSOL</span>
        <i>&rsaquo;</i>
        <span className="au">TOKENIZED GOLD</span>
      </div>
      <p>
        Three layers, each backed by the next. A launched token&apos;s treasury
        holds <b>cTokens</b>. A cToken is a deflationary wrapper of a blue-chip
        asset (BTC, SOL) that burns supply on every trade, and it accumulates
        its own isolated reserve of <b>tokenized gold</b> as the last resort.
        Because its supply only ever shrinks, both backing ratios climb over
        time: each cToken comes to hold more of its underlying asset and more
        gold per token as it is traded, which is exactly what makes it an ideal
        EOL reserve asset.
      </p>
      <p>
        If a project fails, its holders exit into cTokens. If a cToken&apos;s{" "}
        <b>underlying asset</b> (its base asset) ever fails, cToken holders exit
        into the gold reserve. Every point of failure is addressed.
      </p>
      <div className="note">
        <b>Why tokenized gold:</b> the final layer is an asset whose value does
        not depend on crypto markets at all. The specific gold token is chosen
        per chain by audit quality, native issuance, and liquidity depth.
      </div>
    </section>
  );
}
