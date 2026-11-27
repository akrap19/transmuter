export function GlossarySection() {
  return (
    <section>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Term</th>
              <th>In one line</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>EOL token</strong>
              </td>
              <td>
                The token a project launches here. Carries its own reserves from the first block and a
                defined procedure for what happens if the project ends.
              </td>
            </tr>
            <tr>
              <td>
                <strong>DAO token</strong>
              </td>
              <td>The protocol governance token. It is itself an EOL token, with its own reserves.</td>
            </tr>
            <tr>
              <td>
                <strong>Basket</strong>
              </td>
              <td>The set of reserve assets backing one token. The creator picks them at launch.</td>
            </tr>
            <tr>
              <td>
                <strong>Reserves</strong>
              </td>
              <td>
                Everything standing behind a token: its treasury, any USDC still waiting to be converted
                into the basket, and the cash side of its pools.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Treasury</strong>
              </td>
              <td>
                The project&apos;s reserve holdings, held directly as the assets themselves. Non-custodial,
                grows from fees, redeemable at any time.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Pools</strong>
              </td>
              <td>
                Liquidity belonging to the token&apos;s holders, run by the contract so nobody can pull or
                drain it.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Escrow</strong>
              </td>
              <td>
                The team&apos;s runway, held in USDC and released in tranches. Unspent escrow is paid to
                holders if the project ends.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Redemption value</strong>
              </td>
              <td>
                What one token can claim from the reserves. Quantity based, so no price feed can move it.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Backing ratio</strong>
              </td>
              <td>
                Reserve value against market cap. Price based. Runs Mint to Scale, never prices a
                redemption.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
