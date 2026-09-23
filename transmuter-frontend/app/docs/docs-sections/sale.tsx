export function SaleSection() {
  return (
    <section id="the-public-sale">
      <h2>The Public Sale</h2>
      <p>Sales are raised in <strong>USDC</strong>. There are three sale types.</p>
      <ul>
        <li>
          <strong>Fixed price, for certainty.</strong> One known price, one known valuation.
        </li>
        <li>
          <strong>Reverse Dutch auction, for price discovery.</strong> The price opens high and
          decays toward a minimum the creator sets, so real demand sets the clearing price and there
          is no cheap entry for a sniper.
        </li>
        <li>
          <strong>Overflow pool, for demand-led depth.</strong> The creator sets the tokens on offer
          and a target raise. Price is an output: the listing price is the total raised divided by
          the tokens sold.
        </li>
      </ul>
      <p>
        <strong>Nobody sets the listing price.</strong> It falls out of the raise, and because the
        pools are paired at exactly that price, the listing and the sale price are the same number.
        No buyer is handed an instant loss.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sale window</td>
              <td>Creator set, 1 day to 3 months. Ends early if a cap fills.</td>
            </tr>
            <tr>
              <td>Deposits</td>
              <td>Withdrawable in full at any time before the sale concludes.</td>
            </tr>
            <tr>
              <td>Distribution</td>
              <td>Tokens distribute only at finalisation, by claim.</td>
            </tr>
            <tr>
              <td>Undersubscription</td>
              <td>
                The pools pair only the sold share of their allocation, still at the sale price.
                Unsold sale tokens and unpaired pool tokens both burn.
              </td>
            </tr>
            <tr>
              <td>Short of minimum</td>
              <td>
                The launch voids. Nothing activates and every deposit stays reclaimable forever.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Overflow surplus.</strong> Above target, the pools and treasury scale in the same
        proportions, so the listing price keeps tracking what buyers paid. Escrow is the exception:
        its ask was a fixed number, so at least three quarters of its share of any surplus is
        redirected to the treasury, and the creator may forego more. It is never routed into the
        pools, because cash added to a pool without tokens raises the price rather than the backing,
        and arbitrage takes it straight back out.
      </p>
    </section>
  );
}
