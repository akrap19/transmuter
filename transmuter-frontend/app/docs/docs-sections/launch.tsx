export function LaunchSection() {
  return (
    <section id="launching-a-token">
      <h2>Launching a Token</h2>
      <p>
        Launching is free and permissionless. The creator sets identity, supply, allocations, the
        cToken it launches against, fees and reserve parameters. After deployment, parameters are
        locked on-chain and the treasury is non-custodial: <strong>no one can move it, including
        the creator and including us</strong>.
      </p>
      <h3 id="allocations">Allocations</h3>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Pool</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Public sale</td>
              <td>Minimum 25% of supply.</td>
            </tr>
            <tr>
              <td>Team</td>
              <td>Maximum 20%. Always vested. Any part still unvested burns if the project ends.</td>
            </tr>
            <tr>
              <td>Investors</td>
              <td>
                Maximum 20%. Always vested. Investor tokens never burn, vested or not, because that
                capital was delivered in full.
              </td>
            </tr>
            <tr>
              <td>Contract-owned liquidity</td>
              <td>
                Minimum 10% of supply, split across two pools, EOL/USDC and EOL/SOL. Default 50/50,
                each side between 25% and 75%. Paired at exactly the sale price.
              </td>
            </tr>
            <tr>
              <td>DAO airdrop</td>
              <td>Optional, maximum 10%. Routes to DAO stakers at finalisation.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Vesting clocks for team and investors start at <strong>sale finalisation</strong>, not at
        deployment.
      </p>
      <h3 id="how-the-raise-is-sized">How the raise is sized</h3>
      <p>
        A creator sets three things: the <strong>escrow</strong> the team needs (which may be zero),
        how <strong>supply</strong> is split, and a <strong>total raise</strong>. The protocol
        computes everything else: the price, the market cap, the cash that pairs the pools, and the
        treasury.
      </p>
      <p>
        <strong>The treasury is never chosen.</strong> It is whatever remains once the pools are
        paired and escrow is funded. The raise is sized so the treasury lands on 10% of market cap
        and the pools on at least 10%. A creator who wants a deeper treasury raises more.
      </p>
      <p>
        The minimum raise is <strong>back-solved, not guessed</strong>: the smallest raise that
        pairs the pools, funds the escrow and leaves the treasury on 10%. Three choices push it up:
      </p>
      <ul>
        <li>
          <strong>A larger escrow</strong>, because the sale must fund it first.
        </li>
        <li>
          <strong>A larger liquidity allocation</strong>, because more tokens must be paired with
          cash.
        </li>
        <li>
          <strong>A smaller public sale</strong>, which is less obvious. Selling less of the supply
          for the same money implies a higher price per token, so the pool&apos;s tokens cost more
          to pair.
        </li>
      </ul>
      <p>
        Converting the raise into reserves costs a little: swapping USDC into SOL, and the cToken
        mint premium. So that those costs can never void a sound launch, a launch is accepted with
        the treasury at <strong>8%</strong> or more of market cap, and treasury plus the cash in
        the pools at <strong>18%</strong> or more. Both are checked before anything moves. A launch
        below either does not happen, and every deposit stays reclaimable.
      </p>
    </section>
  );
}
