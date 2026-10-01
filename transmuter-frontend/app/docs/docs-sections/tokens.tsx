export function TokensSection() {
  return (
    <section id="token-types">
      <h2>Token Types</h2>
      <p>
        Three token types make up the protocol. One is created at every launch; the other two are
        shared across every launch.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>What it is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>EOL token</strong>
              </td>
              <td>
                <strong>EOL token.</strong> The token a project launches. It trades like any other
                token, and it carries a treasury held in a cToken plus a defined end of life.
              </td>
            </tr>
            <tr>
              <td>
                <strong>cToken</strong>
              </td>
              <td>
                The shared reserve asset beneath EOL tokens. A project&apos;s treasury holds
                cTokens. Redemption pays out the base asset, not the cToken.
              </td>
            </tr>
            <tr>
              <td>
                <strong>DAO token</strong>
              </td>
              <td>
                <strong>Protocol governance token.</strong> Staking it sets voting weight over
                protocol wide decisions. It is backed the same way the tokens beneath it are, with
                its own treasury held in cSOL.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
