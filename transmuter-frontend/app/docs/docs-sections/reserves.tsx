export function ReservesSection() {
  return (
    <section id="reserve-assets">
      <h2>Reserve assets</h2>
      <h3 id="the-basket">The basket</h3>
      <p>
        A creator picks a basket of reserve assets at launch, from one to five of them. Three to four is
        the practical range. The launch set is <strong>BTC, SOL and USDC</strong>.
      </p>
      <p>
        The reserve choice is the project&apos;s, matched to its own risk appetite. Blue chips,
        stablecoins or a spread across both, each with its own trade-offs.
      </p>
      <p>
        Each reserve asset carries a <strong>collection ratio</strong>: the share of incoming value that
        buys that asset. Value arrives from the sale at launch, from the treasury share of the transfer
        fee, and from the part of every Mint to Scale not paired into the pools.
      </p>
      <h3 id="nothing-rebalances">Nothing rebalances</h3>
      <p>
        A collection ratio governs <strong>inflow only</strong>. No instruction sells one reserve asset
        to buy another, and no vote can order one.
      </p>
      <p>
        The consequence is deliberate: what a basket actually holds drifts away from its collection
        ratios as prices move, and that is correct. Rebalancing means selling reserves, which costs
        slippage on every adjustment and hands a vote the power to move holders&apos; assets between
        assets.
      </p>
      <p>
        What a redemption pays out is built from <strong>quantities</strong>. A 20/40/40 basket
        accumulates its assets in those proportions, and a holder redeeming receives their share of each
        of those balances. Which asset happens to be worth more on the day changes what the payout is
        worth; it does not change the share of each balance they receive.
      </p>
      <h3 id="retiring-a-reserve-asset">Retiring a reserve asset</h3>
      <p>
        Retiring a reserve asset stops new money buying it. The choice of basket at launch is a lasting
        one, so the launchpad says so before a creator commits, and at least one reserve asset must
        always remain.
      </p>
      <p>
        A retirement can be proposed by the token&apos;s creator, by Transmuter, or by any holder with{" "}
        <strong>0.1% of supply or more</strong>. It needs a <strong>5% quorum and a two-thirds
        majority</strong>, and the proposal must say where the retired asset&apos;s collection ratio
        goes.
      </p>
      <p>
        <strong>Retiring a reserve asset never takes it away from holders.</strong> The balance already
        held stays in reserves, keeps counting toward backing, and stays redeemable alongside every
        other reserve asset. Only the inflow stops. Nothing in the protocol writes a reserve asset off a
        holder&apos;s claim, and nothing is going to: an asset that has become worthless is still theirs
        to redeem, and taking it out of the payout would only mean a holder loses the chance that it is
        worth something later.
      </p>
      <h3 id="if-a-reserve-asset-cannot-be-delivered">If a reserve asset cannot be delivered</h3>
      <p>Two different problems, handled in opposite ways.</p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>What causes it</th>
              <th>Mint to Scale</th>
              <th>Redemption</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Cannot be priced</strong>
              </td>
              <td>a feed is down, or two feeds disagree</td>
              <td>
                blocked for a week, then the asset is set aside and minting carries on without it
              </td>
              <td>unaffected, redemption needs no price</td>
            </tr>
            <tr>
              <td>
                <strong>Cannot be moved</strong>
              </td>
              <td>the issuer froze the account, or a venue halted withdrawals</td>
              <td>issuer freeze: blocked for a week, then set aside. Venue halt: blocked</td>
              <td>that share is left out until it can move again</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        USDC&apos;s issuer keeps the ability to freeze accounts because its regulators require it, and
        any real-world reserve asset added later would carry the same power. The same handling applies if
        a pool venue halts withdrawals or the conversion account is frozen: the redemption goes ahead
        without that share, with a warning on screen before the holder commits. The redemption also
        records which shares were left out, so any front end can show it.
      </p>
      <p>
        <strong>Every redemption tries every reserve asset.</strong> Only an asset its issuer has frozen,
        or a pool whose venue has halted withdrawals, can be left out, and both are checked fresh on
        every redemption, so an asset rejoins the moment it can move. Any other failure cancels the whole
        redemption, so nobody is ever paid two assets and quietly skipped on a third.
      </p>
      <p>
        A holder who redeems during a freeze gives up their share of that asset permanently, and the
        interface says so before they commit. That value stays with the holders who wait. The effect is
        intentional: it makes waiting out a freeze the rational choice, so nobody has a reason to rush
        the exit at the exact moment a reserve asset is in trouble.
      </p>
      <div className="note">
        <strong>Redemption is never paused.</strong> A disclosed discount is a better answer than
        suspending the right.
      </div>
    </section>
  );
}
