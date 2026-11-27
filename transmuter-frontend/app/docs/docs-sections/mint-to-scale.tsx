export function MintToScaleSection() {
  return (
    <section id="mint-to-scale">
      <h2>Mint to Scale</h2>
      <p>
        Mint to Scale opens when a token&apos;s backing ratio falls, and that happens in two ways. The
        usual one is a large, fast price rise: the market cap climbs faster than the reserves behind it.
        The other is a reserve asset itself losing a lot of value, which is harder to trigger. Either way,
        the protocol sells new supply above the market price and adds the proceeds to the reserves,
        scaling the backing back up.
      </p>
      <p>
        <strong>The first case is a sign of strength, not trouble.</strong> The ratio has fallen because
        people want the token. Mint to Scale turns that demand into permanent backing instead of letting
        it pass through the market and leave nothing behind.
      </p>
      <p>
        A buyer pays in <strong>USDC</strong>, which counts as reserves immediately. Part of it pairs into
        the token&apos;s own pools, and the rest is split into the reserve assets by the collection
        ratios.
      </p>
      <h3 id="why-it-raises-backing">Why it raises backing</h3>
      <p>
        A mint raises backing per token whenever <strong>the sale price is above the backing per
        token</strong>, which on any token worth minting it is by a wide margin.
      </p>
      <p>
        Worked through: a $10M market cap, 10M tokens at $1, $1M of reserves. That is 10% backing, $0.10
        per token. Mint 10% at $1 with no premium at all and supply goes to 11M while reserves go to $2M,
        so backing per token moves from $0.10 to $0.1818. An{" "}
        <strong>82% rise, from price-over-backing alone.</strong>
      </p>
      <p>
        This does not happen in one go. Backing climbs with every sale through an event, and keeps
        climbing across later events, for as long as the price paid stays above what each token is backed
        by.
      </p>
      <h3 id="how-it-is-priced">How it is priced</h3>
      <p>
        The mint price is the <strong>highest</strong> of the token&apos;s two pool averages and its live
        price, plus a premium on a fixed schedule.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Premium</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>50%</td>
              <td>at the open</td>
            </tr>
            <tr>
              <td>falls 2 points an hour</td>
              <td>through the first day</td>
            </tr>
            <tr>
              <td>2%</td>
              <td>the minimum, from 24 hours onward</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The gate that decides whether a mint may open at all reads the same three numbers the opposite
        way, taking the <strong>lowest</strong> of them. Both directions are deliberate and they are not
        duplication: a pump cannot force the gate open, and if the gate does open, the buyer still pays
        the pumped price. The six-hour clock reads stored pool averages only. The live price is read once,
        at the moment of the mint, and can only ever make a mint stricter.
      </p>
      <h3 id="what-the-premium-is-for">What the premium is for</h3>
      <p>The premium is not what makes this work. It does two other jobs:</p>
      <ul>
        <li>
          <strong>Price discovery.</strong> Any real size moves a pool, and the premium is priced against
          that. Through a pool holding 20% of supply, buying 1% of supply averages around 5% above spot,
          and buying 4% averages around 25% above it. The premium opens well above that and descends
          through it, so the mint is dearer than the market at the open and becomes the better route for
          size as the schedule falls. Either way the money lands in the reserves instead of the pool.
        </li>
        <li>
          <strong>No sniping.</strong> Because it opens dearer than the market, there is nothing to get
          in front of.
        </li>
      </ul>
      <h3 id="the-share-that-pairs-into-the-pools">The share that pairs into the pools</h3>
      <p>
        Between <strong>0% and 50%</strong> of a mint pairs into the token&apos;s own pools instead of
        going to the treasury, set by the creator. That share is{" "}
        <strong>carved out of the declared mint rather than added to it</strong>: a declared 10% mint
        grows supply by 10% whatever the split.
      </p>
      <p>
        It is paired continuously rather than in one lump at the end. Each buy&apos;s share waits as USDC
        and a crank pairs it in small increments as the sale proceeds. It counts as reserves wherever it
        sits.
      </p>
      <p>
        <strong>What the pool share buys is resilience.</strong> Every mint deepens the pools as well as
        the treasury, and each one pairs into pools the previous mints already deepened, so the effect
        compounds. Because mints mostly open after a sharp rise, the pools get deeper at exactly the
        moment a pullback would otherwise hit hardest.
      </p>
      <p>
        <strong>What the split trades is upside against retention.</strong> At an unchanged price the two
        routes pay holders the same amount. The difference is what each one does when the price moves.
      </p>
      <p>
        <strong>Upward, the pool earns.</strong> As the price climbs, the pool sells tokens and takes in
        cash, so the reserves grow in dollar terms while the price is rising. Treasury cash does not move
        on its own. Pool weighting is how reserves capture a rise, and above the redemption value it
        outperforms simply holding the project&apos;s own tokens.
      </p>
      <p>
        <strong>Downward, the pool pays.</strong> The pool is the standing bid, so it buys tokens back and
        pays out cash to whoever is selling. That is what cushions the fall, and it is also why that cash
        leaves. Treasury cash is never touched by a seller, so it is still there at the bottom.
      </p>
      <p>
        So treasury weighting retains more through a dump, and pool weighting earns more on the way up and
        absorbs the selling on the way down. Neither is the right answer for every project, which is why
        the creator sets it.
      </p>
      <h3 id="when-it-can-fire">When it can fire</h3>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Limit</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Automatic trigger</td>
              <td>
                Backing below the creator&apos;s activation threshold (5% to 17%) continuously for 6
                hours, read off stored pool averages. Opens for up to 25% supply growth, no vote.
              </td>
            </tr>
            <tr>
              <td>Automatic close</td>
              <td>
                Backing climbs above the deactivation threshold (20% to 35%), or the allowance is fully
                minted. The two thresholds are always at least 10 points apart, so an event cannot flap on
                and off. Once an event closes it stays closed, and a new one opens whenever backing falls
                back below the activation threshold for 6 hours, with the premium starting again at 50%.
              </td>
            </tr>
            <tr>
              <td>Governance path</td>
              <td>
                The creator or a holder with 0.1% of supply or more proposes an event (for the DAO token,
                Transmuter or the DAO council) up to the same 25% cap, within the remaining annual
                budget. Approval needs 55% of participating staked weight with a 3% quorum, running 24 to
                48 hours. A token&apos;s holders decide this alone. It closes only when fully minted.
              </td>
            </tr>
            <tr>
              <td>Annual budget</td>
              <td>
                40% to 100% of supply a year, set by the creator at launch and changeable afterwards by
                vote within those bounds. Every minted token counts against it, whatever the size of the
                event.
              </td>
            </tr>
            <tr>
              <td>Gap</td>
              <td>
                None. A new event can open as soon as its trigger holds again; the annual budget is the
                limit.
              </td>
            </tr>
            <tr>
              <td>Lockout</td>
              <td>No event of any kind opens while backing is at or above 50%.</td>
            </tr>
            <tr>
              <td>Concurrency</td>
              <td>One open event at a time, across both paths.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>The budget is what bounds dilution, not a count of events.</strong> The creator sets it at
        launch, anywhere from 40% to 100%, and it can be moved afterwards by proposal and a holder vote,
        within those same bounds. There is no limit on the number of events, because a count of events
        does not bound how much supply gets created and a budget does.
      </p>
      <p>
        No flash loan survives six hours. Holding a pool away from its true price for that long means
        buying continuously as arbitrageurs sell into you, against the token&apos;s own liquidity. It is a
        bleed, not a trade.
      </p>
      <h3 id="the-gate-refuses-when-it-cannot-see">The gate refuses when it cannot see</h3>
      <p>
        <strong>There is no paid price feed for any launched token, and there never will be.</strong> A
        token is priced from its own pools. The DAO token alone may carry paid feeds, used for the DAO
        launch mint, for valuing DAO pools, and for checking what the protocol&apos;s own swaps into DAO
        tokens receive.
      </p>
      <p>
        A token&apos;s own read is cross-checked against itself. Dividing the stablecoin pool average by
        the SOL pool average gives the SOL rate the token&apos;s own two pools imply, and that is compared
        against one external SOL/USD read. Beyond a 13% gap, the mint fails closed.
      </p>
      <p>
        Reserve assets still need their own working, agreeing feeds. If an asset has a feed down or two feeds
        that disagree, mints stop. An asset that cannot be priced is never treated as worthless while that
        might be an attack, because that would understate reserves and wrongly open the gate.
      </p>
      <p>
        <strong>If an asset stays down for a week, Mint to Scale carries on without it.</strong> That
        covers an asset whose feeds have been dead for a week and an asset its issuer has frozen for a
        week. The asset is set aside for minting only: it counts as zero at the gate, and its share of new
        mint money goes to the working assets in proportion to their own weights. With 20% USDC, 40% BTC,
        30% SOL and 10% in a fourth asset, and SOL set aside, mint money goes 28.57% USDC, 57.14% BTC and
        14.29% to the fourth. Nothing already held is sold, an asset with dead feeds is still paid out on
        every redemption, and the asset rejoins by itself the moment it works again. Counting it at zero
        lowers the backing ratio, so this can open a mint by itself. If the feeds went down for a false
        reason, Transmuter can pull a brake that keeps mints stopped until the feed is replaced.
      </p>
      <p>
        A blocked mint traps nobody, and redemption keeps working throughout, because it needs no prices
        at all.
      </p>
    </section>
  );
}
