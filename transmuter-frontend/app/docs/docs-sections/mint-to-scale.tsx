export function MintToScaleSection() {
  return (
    <section id="mint-to-scale">
      <h2>Mint to Scale</h2>
      <p>
        If a token&apos;s backing thins, the protocol can rebuild it by selling new supply into the
        treasury.
      </p>
      <p>
        A buyer pays in SOL. The SOL enters the cToken&apos;s reserve, cSOL is minted into that EOL
        token&apos;s treasury, and the buyer receives EOL tokens. Every event is priced at the
        higher of a manipulation-resistant snapshot (a 6-hour time-averaged, dual-oracle read) and
        the live price, plus a premium that can open as high as <strong>100%</strong> and descends
        to a <strong>5%</strong> minimum.
      </p>
      <h3 id="why-it-raises-backing">Why it raises backing</h3>
      <p>
        A mint raises backing per token whenever the sale price is above the backing per token,
        which on any token worth minting it is by a wide margin. Take a token trading at $1 with
        $0.10 of backing per token. Every new token sold brings in $1, but takes only an equal share
        of the reserve, the same as every other token. So each sale lifts backing per token for
        everyone, holders and new buyers alike.
      </p>
      <p>
        This does not happen in one go. Backing climbs with every sale through an event, and keeps
        climbing across later events, for as long as the price paid stays above what each token is
        backed by.
      </p>
      <p>The premium is not what makes this work. It does two other jobs:</p>
      <ul>
        <li>
          <strong>Price discovery.</strong> Buying the same amount on the open market would cost far
          more in slippage than the premium. A buyer who wants size pays close to fair value, and
          the money lands in the treasury instead of the pool.
        </li>
        <li>
          <strong>No sniping.</strong> A mint can never be cheaper than buying on the market.
        </li>
      </ul>
      <h3 id="the-protocol-s-share-of-each-mint">The protocol&apos;s share of each mint</h3>
      <p>
        Part of every mint can go into the token&apos;s contract-owned liquidity instead of to the
        buyer. It is set between <strong>0% and 15%</strong>, with around <strong>10%</strong> the
        recommended setting.
      </p>
      <p>
        At 10%, for every nine tokens sold to buyers, the protocol mints one more for itself. It
        pays the same price for it, which becomes that token&apos;s backing in the treasury, and it
        pairs the token with cash from the sale in the pools. So out of the sale proceeds, one tenth
        of the mint&apos;s value pays for the protocol&apos;s tokens and stays in the treasury, and
        another tenth leaves to pair them.
      </p>
      <p>
        <strong>What it buys is depth.</strong> Every mint deepens the pools as well as the
        treasury, and each one pairs into pools the previous mints already deepened, so the effect
        compounds. A token that has run hard and minted into that strength is much harder to sink
        afterwards, because the pools absorb selling far better. That also offsets the one real
        downside of Mint to Scale: while a mint is open, buyers who mint are not buying on the open
        market.
      </p>
      <p>
        <strong>What it costs is small.</strong> At the end, the pools&apos; tokens burn and their
        cash joins the reserves, so at an unchanged price the two routes pay holders exactly the
        same. The only difference comes from the price moving afterwards: if a token ends above the
        price it minted at, routing to the pools pays holders slightly more, and if it ends below,
        slightly less, because cash held in a pool moves with the price and cash in the treasury
        does not.
      </p>
      <h3 id="automatic-path">Automatic path</h3>
      <p>
        If the backing ratio stays below the creator&apos;s <strong>activation threshold</strong>{" "}
        (5% to 17%) <strong>continuously for 6 hours</strong>, an event opens by itself for up to
        15% of supply, with no vote. It closes once backing climbs back above a higher{" "}
        <strong>deactivation threshold</strong> (20% to 35%), or once its allocation has been fully
        minted. The gap between the two thresholds is always at least 10 points, so the event cannot
        flap on and off. No flash loan survives six hours.
      </p>
      <h3 id="governance-path">Governance path</h3>
      <p>
        Holders can vote an event open: an ambassador proposes 5% to 15% of supply, approval needs{" "}
        <strong>55% of participating staked weight</strong> with a <strong>3% quorum</strong>, and
        the vote runs for <strong>24 to 48 hours</strong>. A token&apos;s holders decide this alone.
        If a token has run hard and its holders want to scale its backing, that is their call.
      </p>
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
              <td>Automatic events</td>
              <td>Max 3 per rolling year, at least 60 days apart.</td>
            </tr>
            <tr>
              <td>Governance events</td>
              <td>Max 3 per rolling year.</td>
            </tr>
            <tr>
              <td>Lockout</td>
              <td>No event of any kind opens while backing is at or above 50%.</td>
            </tr>
            <tr>
              <td>Slot use</td>
              <td>
                An event counts against the yearly limit only if it mints more than 25% of its
                allowance.
              </td>
            </tr>
            <tr>
              <td>Concurrency</td>
              <td>One open event at a time, across both paths.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
