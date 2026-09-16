export function RatiosSection() {
  return (
    <section id="ratios">
      <h2>Ratios &amp; Verification</h2>
      <p>
        Two ratios with two different jobs. One counts what each token can claim
        from the reserve; the other evaluates live backing to drive the
        automatic mint trigger. Neither one sets a market price, and keeping
        them separate is what makes the system hard to manipulate.
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Ratio</th>
              <th>Based on</th>
              <th>Definition</th>
              <th>Used for</th>
            </tr>
            <tr>
              <td>Redemption ratio</td>
              <td>Quantity</td>
              <td>
                Treasury quantity / circulating supply. Example: 100,000 cSOL in
                treasury and 1,000,000 tokens circulating means each token
                redeems for 0.1 cSOL. Quantity-based, so no price feed touches
                it; it changes only when the treasury or supply actually
                changes, and over time it trends upward as fees accumulate and
                supply burns.
              </td>
              <td>What a redeemer receives.</td>
            </tr>
            <tr>
              <td>Backing ratio</td>
              <td>Value</td>
              <td>
                Treasury value (quantity x backing asset price) / token market
                cap (circulating supply x token price). Fluctuates with the
                market price of the token and of its backing asset. Prices come
                from dual oracles, never AMM spot reads.
              </td>
              <td>Automatic mint trigger and lockouts only.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The redemption ratio uses no prices at all, so no flash loan, pool
        manipulation, or market action can move it. It is not constant: it grows
        over time as trading fees flow into the treasury and supply burns, and
        because that growth tracks real trading volume it is not perfectly
        predictable in advance. What it never does is move off a price feed, it
        changes only from on-chain quantities. The backing ratio is the one that
        tracks market price, and it can open mint events but never sets the
        market price or the redemption ratio. Both are public reads; the
        dashboard shows them independently and together.
      </p>
    </section>
  );
}
