export function GlossarySection() {
  return (
    <div className="tw" style={{ marginTop: 28 }}>
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
              The token a project launches here. Carries its own reserves from the first block and
              a defined procedure for what happens if the project ends.
            </td>
          </tr>
          <tr>
            <td>
              <strong>cToken</strong>
            </td>
            <td>
              The reserve asset an EOL token&apos;s treasury is held in, such as cSOL. A system
              token: nobody buys, trades or holds one directly.
            </td>
          </tr>
          <tr>
            <td>
              <strong>DAO token</strong>
            </td>
            <td>
              The protocol governance token. Backed by its own reserves in cSOL.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Reserves</strong>
            </td>
            <td>
              Everything standing behind a token: its treasury, its contract-owned liquidity and
              any unspent escrow.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Treasury</strong>
            </td>
            <td>
              The project&apos;s own reserve account, held in a cToken. Non-custodial, grows from
              fees, redeemable by holders.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Escrow</strong>
            </td>
            <td>
              The team&apos;s runway, held in USDC and released in tranches. Unspent escrow is
              paid to holders if the project ends.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Redemption ratio</strong>
            </td>
            <td>
              What each token can claim from the treasury. Quantity based, so no price feed can
              move it.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Backing ratio</strong>
            </td>
            <td>
              Treasury value against market cap. Price based, and used only to open Mint to Scale,
              never to price a redemption.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
