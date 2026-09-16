export function TokensSection() {
  return (
    <section id="tokens">
      <h2>Token Types</h2>
      <p>
        Three token types make up the protocol. One is created at every launch,
        the project&apos;s own token; the other two, the contingency asset that
        backs it and the governance token that runs the system, are protocol wide
        and shared across every launch.
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Token</th>
              <th>What it is</th>
            </tr>
            <tr>
              <td>
                <b>EOL token</b>
              </td>
              <td>
                <b>End of life token.</b> The token a project launches on
                Transmuter. It carries a funded, non-custodial reserve from day
                one and a contract defined end of life path: if the project
                ends, holders vote, the protocol liquidates, and everyone
                redeems their share of the reserve. Its treasury is held in
                cTokens.
              </td>
            </tr>
            <tr>
              <td>
                <b>cToken</b>
              </td>
              <td>
                <b>Contingency token.</b> A deflationary wrapper of a blue-chip
                asset such as BTC or SOL, traded as cBTC or cSOL. It burns supply
                on every trade, so backing per token only grows, and it holds
                its own isolated reserve of tokenized gold as the last resort.
                EOL token treasuries hold cTokens as their backing.
              </td>
            </tr>
            <tr>
              <td>
                <b>DAO token</b>
              </td>
              <td>
                <b>Protocol governance token.</b> Staking it sets voting weight
                over protocol wide decisions, and stakers receive a share of any
                launch that opts into a DAO airdrop, which aligns the wider
                community with every new token. There are no hidden admin keys:
                staked DAO holders, alongside elected ambassadors, hold the
                authority.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="note">
        <b>How they stack:</b> an EOL token is backed by cTokens, each cToken
        is backed by tokenized gold, and the DAO token governs the protocol that
        runs all of it. The collateral chain below walks each fallback in order.
      </div>
    </section>
  );
}
