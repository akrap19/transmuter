export function SaleSection() {
  return (
    <section id="the-public-sale">
      <h2>The public sale</h2>
      <p>
        Sales are raised in <strong>USDC</strong>. Deposits are withdrawable in full at any time until
        the sale closes, and tokens distribute only at finalisation, by claim.
      </p>
      <div className="note">
        <strong>Nobody sets the listing price.</strong> For every sale type the listing price is the
        money raised divided by the tokens sold, and because the pools are paired at exactly that price,
        the listing price and the sale price are the same number. No buyer is handed an instant loss.
      </div>
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
              <td>Creator set, 1 week to 3 months. Ends early if a cap fills.</td>
            </tr>
            <tr>
              <td>Deposits</td>
              <td>Withdrawable in full at any time before the sale concludes.</td>
            </tr>
            <tr>
              <td>Distribution</td>
              <td>By claim, opening the moment the pools open, 10 minutes after finalisation.</td>
            </tr>
            <tr>
              <td>Short of minimum</td>
              <td>The launch voids. Nothing activates and every deposit stays reclaimable forever.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 id="fixed-price-the-default">Fixed price, the default</h3>
      <p>
        One known price, one known valuation. If the sale undersells, the pools pair only the sold share
        of their allocation, still at the sale price. Unsold sale tokens and unpaired pool tokens both
        burn, and both burns feed the market cap the launch checks are measured against.
      </p>
      <h3 id="overflow-sale-optional">Overflow sale, optional</h3>
      <p>
        The number of tokens on sale is fixed, so the price rises with demand. The creator sets a target
        raise and an overflow cap, and both are required.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Raise</th>
              <th>What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>At or above target</td>
              <td>
                Listing price is the money raised divided by the tokens on sale. Every buyer receives
                tokens in proportion to what they paid.
              </td>
            </tr>
            <tr>
              <td>Below target</td>
              <td>The launch voids and every depositor withdraws in full.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The target is a hard minimum, and the cap is mandatory, so there are no uncapped sales. Above
        target, escrow stays at its declared need, the overflow money pays the dearer pool pairing first,
        and everything left goes to the treasury.
      </p>
      <p>
        Worked through: a target of 10,000 USDC for 10,000 tokens, so 1.00 each. The sale raises 20,000,
        so listing is 2.00. A buyer who paid 1,000 receives 500 tokens worth 1,000. Same money each,
        fewer tokens, and the token starts at double the market cap.
      </p>
      <h3 id="no-bonding-curve-ever">No bonding curve, ever</h3>
      <p>
        A bonding curve charges each buyer more than the last, which is exactly what snipers and bundlers
        profit from. Here everyone in a sale pays one price, set at the end, so buying first or splitting
        across wallets gains nothing.
      </p>
    </section>
  );
}
