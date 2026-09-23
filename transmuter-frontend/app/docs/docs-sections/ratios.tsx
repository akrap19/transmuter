export function RatiosSection() {
  return (
    <section id="ratios-and-verification">
      <h2>Ratios and Verification</h2>
      <p>
        Two ratios with two different jobs. Neither sets a market price, and keeping them separate
        is what makes the system hard to manipulate.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Ratio</th>
              <th>Based on</th>
              <th>Definition</th>
              <th>Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Redemption ratio</strong>
              </td>
              <td>Quantity</td>
              <td>
                cTokens in the treasury divided by circulating supply. Example: 100,000 cSOL in the
                treasury and 1,000,000 tokens circulating means each token claims 0.1 cSOL, paid out
                as the SOL behind it.
              </td>
              <td>What a redeemer receives.</td>
            </tr>
            <tr>
              <td>
                <strong>Backing ratio</strong>
              </td>
              <td>Value</td>
              <td>
                Treasury value divided by market cap. Moves with the price of the token and of the
                base asset. Prices come from dual oracles, never from an AMM spot read.
              </td>
              <td>Opening Mint to Scale, and lockouts. Nothing else.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The redemption ratio uses no prices, so no flash loan, pool manipulation or market action
        can move it. It changes only when the treasury or supply actually changes, and it trends
        upward as fees accumulate.
      </p>
      <p>
        Both ratios are public reads. Contract addresses will be published once deployed, and the
        dashboard will show both ratios for any token, including before you buy it.
      </p>
    </section>
  );
}
