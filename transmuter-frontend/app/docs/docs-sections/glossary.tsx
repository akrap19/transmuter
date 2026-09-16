export function GlossarySection() {
  return (
    <div className="tbl-scroll" style={{ marginTop: 28 }}>
      <table>
        <tbody>
          <tr>
            <th>Term</th>
            <th>In one line</th>
          </tr>
          <tr>
            <td>
              <b>EOL token</b>
            </td>
            <td>
              The token a project launches here. Carries its own reserve and a defined end
              of life path.
            </td>
          </tr>
          <tr>
            <td>
              <b>cToken</b>
            </td>
            <td>
              The contingency asset that backs an EOL token (cBTC, cSOL). Deflationary, and
              gold-backed underneath.
            </td>
          </tr>
          <tr>
            <td>
              <b>DAO token</b>
            </td>
            <td>
              The protocol governance token. Staking it sets voting weight and earns a share
              of opted-in airdrops.
            </td>
          </tr>
          <tr>
            <td>
              <b>Reserve / treasury</b>
            </td>
            <td>
              The pool of cTokens backing an EOL token. Non-custodial, grows from fees,
              redeemable by holders.
            </td>
          </tr>
          <tr>
            <td>
              <b>Escrow</b>
            </td>
            <td>
              The team&apos;s development runway, locked at launch and released in vested
              tranches, not payable at will.
            </td>
          </tr>
          <tr>
            <td>
              <b>Redemption ratio</b>
            </td>
            <td>
              What each token can claim from the reserve. Quantity based, so no price feed
              can move it.
            </td>
          </tr>
          <tr>
            <td>
              <b>Backing ratio</b>
            </td>
            <td>
              Live reserve value against market cap. Price based, and only ever used to
              trigger mints, never to price a redemption.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
