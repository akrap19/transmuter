export function LaunchSection() {
  return (
    <section id="launching-a-token">
      <h2>Launching a token</h2>
      <p>
        Launching is free and permissionless. The creator sets token identity, supply, allocations, the
        basket, fees and the escrow they need. After deployment, parameters are locked on-chain, apart
        from the few a holder vote can change within fixed bounds (see Governance), and the treasury is
        non-custodial: <strong>no instruction lets anyone take it, including the creator and including
        us</strong> (see <a href="#governance">Governance</a>). It moves only by the rules: redemptions, a treasury draw into escrow that holders
        vote for, and end of life. The program that holds the reserves can still be upgraded for now;{" "}
        <a href="#governance">Governance</a> says who can upgrade it and how that changes.
      </p>
      <p>
        The flow is deliberately short. Pick a launch type, memecoin or serious project, and the presets
        for that type fill in nearly everything. The creator sets identity, the escrow target, the share
        of supply they need, and the reserve basket. The rest auto-calculates and can still be adjusted.
      </p>
      <h3 id="the-two-launch-types">The two launch types</h3>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Memecoin</th>
              <th>Serious project</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Escrow</td>
              <td>none</td>
              <td>optional, any amount</td>
            </tr>
            <tr>
              <td>Investor allocation</td>
              <td>none</td>
              <td>allowed, vested</td>
            </tr>
            <tr>
              <td>How the creator earns</td>
              <td>a share of the transfer fee, or vested tokens</td>
              <td>escrow, plus the same options</td>
            </tr>
            <tr>
              <td>Treasury draw into escrow</td>
              <td>not available</td>
              <td>available</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 id="allocations">Allocations</h3>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Allocation</th>
              <th>Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Public sale</td>
              <td>
                Minimum 25% of supply. Only the sold portion funds the backing every token shares.
              </td>
            </tr>
            <tr>
              <td>Team</td>
              <td>
                Maximum 30%. Always vested. Any part still unvested burns if the project ends.
              </td>
            </tr>
            <tr>
              <td>Investors</td>
              <td>
                Maximum 30%, serious projects only. Always vested. Investor tokens never burn, vested or
                not, because that capital was delivered in full.
              </td>
            </tr>
            <tr>
              <td>Pools</td>
              <td>Minimum 10% of supply, paired at exactly the sale price.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Vesting clocks for team and investors start at <strong>sale finalisation</strong>, not at
        deployment, and nothing unlocks at listing. Vesting is fixed at launch: nobody can add or change
        entries afterwards. A cliff releases what has built up by then, and the rest vests evenly after
        it.
      </p>
      <h3 id="how-the-raise-is-sized">How the raise is sized</h3>
      <p>
        A creator sets three things: the <strong>escrow</strong> the team needs, which may be zero, how{" "}
        <strong>supply</strong> is split, and a <strong>total raise</strong>. The protocol computes
        everything else: the price, the market cap, the cash that pairs the pools, and the treasury.
      </p>
      <p>
        <strong>The treasury is the remainder</strong>, not a separate pot: whatever is left once the
        pools are paired and escrow is funded. That does not mean a creator has to do the arithmetic
        themselves. They can name the treasury share they want and have the raise computed backwards from
        it, or name a raise and see the treasury that falls out. A bigger treasury means a bigger raise,
        because the extra has to come from somewhere.
      </p>
      <p>
        The minimum raise is back-solved rather than guessed: the smallest raise that pairs the pools,
        funds the escrow and leaves the treasury on its target. Three choices push that minimum up:
      </p>
      <ul>
        <li>
          <strong>A larger escrow</strong>, because the sale must fund it first.
        </li>
        <li>
          <strong>A larger liquidity allocation</strong>, because more tokens must be paired with cash.
        </li>
        <li>
          <strong>A smaller public sale</strong>, which is less obvious. Selling less of the supply for
          the same money implies a higher price per token, so the pool&apos;s tokens cost more to pair.
        </li>
      </ul>
      <p>
        Every check below runs on the exact USDC raised, before anything moves or is converted, so
        conversion costs can never void a launch.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Threshold</th>
              <th>What it protects</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Raise</strong>
              </td>
              <td>the minimum raise, or for an overflow sale the target</td>
              <td>a sale that did not raise enough never activates</td>
            </tr>
            <tr>
              <td>
                <strong>Escrow</strong>
              </td>
              <td>the raise covers the escrow ask in full</td>
              <td>the team&apos;s runway, or the launch does not happen</td>
            </tr>
            <tr>
              <td>
                <strong>Pools</strong>
              </td>
              <td>
                every configured pool&apos;s pairing is covered, and the pools hold 10% of market cap at
                listing, hard
              </td>
              <td>tradeable depth from the first block</td>
            </tr>
            <tr>
              <td>
                <strong>Treasury minimum</strong>
              </td>
              <td>8% of market cap at listing</td>
              <td>
                backing <strong>quality</strong>, since treasury assets are neither
                arbitrage-extractable nor exposed to impermanent loss
              </td>
            </tr>
            <tr>
              <td>
                <strong>Combined backing</strong>
              </td>
              <td>18% of market cap at listing</td>
              <td>
                the published <strong>quantity</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        A launch that fails any check does not happen, and every deposit stays reclaimable forever. A
        launch landing between 8% and 10% treasury succeeds and emits a public shortfall event.
      </p>
      <p>
        <strong>Why the treasury carries two numbers.</strong> 10% is what a raise is sized against in the
        launchpad, and a set-up that cannot reach it is refused when it is configured. 8% is what the
        contract enforces at finalisation. A launch can only land between the two if a fixed-price sale
        undersells: escrow is a fixed dollar amount, so it takes a bigger share of a smaller raise.
        Converting into the basket happens after the checks and costs a little in swap fees and slippage
        on top.
      </p>
      <div className="note">
        <strong>So the enforced minimum is 18% of market cap at listing</strong>, being an 8% treasury
        plus 10% in the pools. That is the lowest set-up allowed, so every launch will carry at least
        this, and a creator can choose more. And what a holder actually receives is higher than 18%,
        because the tokens sitting inside the pools never claim anything: the reserves are divided
        between fewer tokens than the supply figure suggests. At the enforced minimums that works out
        around 20% per claiming token, and around 22% at the 10% treasury a raise is sized to.
      </div>
      <p>
        Those are <strong>live</strong> figures, counting only what sits in the reserves while the token
        is trading. They leave out what end of life adds on top: unspent escrow coming back, and unvested
        team tokens burning so that fewer tokens share the same reserves.
      </p>
      <h3 id="after-the-checks-pass">After the checks pass</h3>
      <p>
        A public 10-minute countdown starts, so everyone knows exactly when trading opens. When it ends,
        the pools are seeded and buyers&apos; claims open in that same step, so the official pools set the
        first price before anyone holds a token. Escrow is funded, DAO tokens are minted for a DAO pool if
        one was chosen, and unsold tokens burn. Then{" "}
        <strong>a separate step, which anyone can run, converts the treasury&apos;s USDC into the
        basket.</strong>
      </p>
      <p>
        Until that step has run, the USDC sits in a holding account under the reserves program. It counts
        as backing and it is redeemable. Every token is in this state on launch day, so any backing figure
        that ignores it is wrong.
      </p>
      <p>
        The same is true for the rest of a token&apos;s life. The treasury&apos;s share of the transfer
        fee and the proceeds of every Mint to Scale also arrive as USDC and wait there until someone runs
        the conversion. Whenever these docs say <strong>USDC not yet converted</strong>, that is what it
        means: reserve money already collected and already redeemable, not yet swapped into the basket.
      </p>
    </section>
  );
}
