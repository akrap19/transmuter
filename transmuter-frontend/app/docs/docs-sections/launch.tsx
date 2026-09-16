export function LaunchSection() {
  return (
    <section id="launch">
      <h2>Launching a Token</h2>
      <p>
        Launching is free and permissionless. The creator sets identity, supply,
        allocations, backing cToken, fees, and reserve parameters. After
        deployment, parameters are locked on-chain and the treasury is
        non-custodial: <b>no one can access it, including the creator and including us</b>.
      </p>
      <h3>Allocations</h3>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Pool</th>
              <th>Rule</th>
            </tr>
            <tr>
              <td>Public sale</td>
              <td>Minimum 20% of supply. Hard enforced.</td>
            </tr>
            <tr>
              <td>Team</td>
              <td>Maximum 20%. Always vested.</td>
            </tr>
            <tr>
              <td>Investors</td>
              <td>Maximum 20%. Always vested.</td>
            </tr>
            <tr>
              <td>Liquidity pool</td>
              <td>
                Minimum 10% of supply, paired with sale proceeds{" "}
                <b>at the sale price</b>, so the token lists at exactly what
                buyers paid for it and nobody is handed an instant loss. The cost
                of that pairing is derived, not chosen: it is the pool&apos;s
                share of supply divided by the sale&apos;s share. The LP position
                is owned by the token&apos;s contracts, not by any person and not
                by us.
              </td>
            </tr>
            <tr>
              <td>DAO airdrop</td>
              <td>
                Optional, maximum 10%. Routes to protocol DAO stakers at
                finalization.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Vesting clocks for team and investors start at <b>sale finalization</b>,
        not at deployment.
      </p>
    </section>
  );
}
