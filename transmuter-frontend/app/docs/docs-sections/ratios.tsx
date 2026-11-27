export function RatiosSection() {
  return (
    <section id="ratios-and-verification">
      <h2>Ratios and verification</h2>
      <p>Two figures, doing different jobs.</p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Redemption value</th>
              <th>Backing ratio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>What it is</strong>
              </td>
              <td>your pro-rata share of the balances actually held</td>
              <td>reserve value against market cap</td>
            </tr>
            <tr>
              <td>
                <strong>Based on</strong>
              </td>
              <td>quantities held</td>
              <td>prices</td>
            </tr>
            <tr>
              <td>
                <strong>Moves with the market?</strong>
              </td>
              <td>yes, in what it is worth</td>
              <td>yes</td>
            </tr>
            <tr>
              <td>
                <strong>What it drives</strong>
              </td>
              <td>what you are paid</td>
              <td>whether Mint to Scale can fire</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>What moves and what does not.</strong> The dollar value of a redemption does move with
        the market: the reserve assets have prices of their own, and the pools&apos; cash side scales
        with the token price. What never moves is <strong>the share</strong>. You always receive the same
        pro-rata slice of whatever is held, and no price feed, vote or market condition sets that slice.
        Fees add to those balances continuously, from every transfer, every mint and the retained part of
        every redemption.
      </p>
      <div className="note">
        <strong>No price feed prices a redemption.</strong> A redeemer receives a share of each reserve
        asset&apos;s balance, in kind. That is arithmetic on on-chain integers, so an oracle outage or a
        disagreement between price sources cannot block or reduce a redemption. A venue halting
        withdrawals cannot block one either, but it does reduce it while it lasts, because that
        pool&apos;s share is left out.
      </div>
      <p>
        Prices are needed for six things, and a redemption is not one of them: the backing ratio display,
        the Mint to Scale gate and mint price, valuing a treasury draw into escrow, the end of life
        trouble condition, pricing DAO tokens minted for a DAO pool, and setting the least each of the
        protocol&apos;s own swaps must receive. All of them degrade safely: a swap that cannot be checked
        simply waits.
      </p>
      <h3 id="what-the-redemption-value-does-and-does-not-do">
        What the redemption value does and does not do
      </h3>
      <p>
        It is not a number that only ever rises. The table says when it moves and which way.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>What happens</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Someone redeems</td>
              <td>never lowers it, usually lifts it slightly</td>
            </tr>
            <tr>
              <td>Fees arrive</td>
              <td>raises it</td>
            </tr>
            <tr>
              <td>The burn share of the transfer fee</td>
              <td>raises it</td>
            </tr>
            <tr>
              <td>Someone buys above it</td>
              <td>raises it</td>
            </tr>
            <tr>
              <td>Someone sells above it</td>
              <td>
                <strong>lowers it</strong>
              </td>
            </tr>
            <tr>
              <td>The reserve assets fall in price</td>
              <td>
                <strong>lowers it</strong> in dollar terms
              </td>
            </tr>
            <tr>
              <td>A treasury draw into escrow passes</td>
              <td>
                <strong>lowers it</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Why selling above it lowers it.</strong> The pools belong to the token, so a sale retires
        a claim using reserve money, and above the redemption value that costs more than the claim was
        worth. How far it can travel is set by how far the price sits above the redemption value and by
        how much of the reserves sit in the pools rather than the treasury, because selling never touches
        the treasury. At a launch sitting on the enforced minimums, selling alone can move it down by
        around a fifth.
      </p>
      <p>
        <strong>What holds instead is convergence.</strong> Selling pushes the price down toward the
        redemption value and the redemption value down toward the price, until they meet. The price
        cannot stay below the redemption value, because buying under it and redeeming is a profit anyone
        can take. Fees and buying lift it again from there.
      </p>
      <p>
        <strong>The pools&apos; size grows while the token trades.</strong> Their liquidity, meaning
        how much sits in the pool rather than what it is worth, is added to by the pools&apos; share of
        the transfer fee, by Mint to Scale pairing and by the pools&apos; own trading fees, and trading
        never takes it away. It shrinks only when holders redeem their share, or at end of life. What it
        is worth in dollars moves with the price.
      </p>
    </section>
  );
}
