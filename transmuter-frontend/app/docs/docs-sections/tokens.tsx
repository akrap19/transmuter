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
                <strong>End of life token.</strong> The token a project launches. It trades like any
                other token, and it carries a treasury held in a cToken plus a defined end of life
                procedure.
              </td>
            </tr>
            <tr>
              <td>
                <strong>cToken</strong>
              </td>
              <td>
                <strong>Contingency token.</strong> A system token that records how much of a
                reserve asset stands behind an EOL token. It is non-transferable, has no public mint
                and no market, and is created only when an EOL token&apos;s own contract mints it
                into its own treasury. Holders never receive one: when they redeem, they receive the
                asset underneath it.
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
