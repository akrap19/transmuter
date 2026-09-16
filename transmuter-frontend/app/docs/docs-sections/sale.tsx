export function SaleSection() {
  return (
    <section id="sale">
      <h2>The Public Sale</h2>
      <p>
        Three sale types, no bonding curve, each chosen for what a launch needs
        most:
      </p>
      <ul className="doc-list">
        <li>
          <b>Fixed price, for certainty.</b> One known price, one known
          valuation. The simplest story, and the right tool when a creator wants
          a predictable raise.
        </li>
        <li>
          <b>Reverse Dutch auction, for price discovery.</b> The price opens high
          and decays toward a floor, and buyers clear at whatever price the
          market meets it. There is no fixed cheap entry for a sniper to grab,
          so real demand sets the clearing price. The creator sets the start
          price, the floor (which becomes the listing anchor), the decay step,
          and how often it steps down.
        </li>
        <li>
          <b>Overflow pool, for demand led depth.</b> The creator sets a fixed
          number of sale tokens and a <b>target raise</b>, and the pool simply
          collects funds. Price is an <b>output, not an input</b>: the final
          listing price is the total raised divided by the tokens sold, so the
          launch valuation is set by real demand rather than guessed in advance.
          Raise 66M against 10M tokens and it lists at $6.60; raise 100M and it
          lists at $10. This has the strongest potential to build deep liquidity
          and a large treasury. If the pool raises less than target the sale{" "}
          <b>fails and everyone reclaims</b>, because the target is what
          guarantees the escrow, treasury, and liquidity minimums. A mandatory 24
          hour window, in which deposits close but withdrawals stay open, keeps a
          late whale from repricing everyone at the last moment, and an optional
          raise cap scales anything above it down pro rata to hold the valuation
          where the creator wants it.
        </li>
      </ul>
      <p>
        All three seed the reserve before the token trades, and in every type
        buyers deposit the <b>backing cToken</b>, which makes each launch direct
        demand for the reserve asset itself.
      </p>
      <p>
        <b>Nobody sets the listing price.</b> In all three sale types it falls
        out of the raise. If a sale offers half the supply and takes in 5M
        dollars, the whole supply is worth 10M dollars, and the listing price is
        that valuation divided by the token count. Because the pool is paired at
        exactly that price, the listing and the sale price are the same number
        by construction, and no buyer is handed an instant loss.
      </p>
      <p>
        <b>What the creator sets, and what follows from it.</b> A creator
        chooses the <b>escrow amount</b> the team needs (which may be zero),
        how the <b>token supply</b> is split between the public sale, the
        liquidity pool, the team and the rest, and a <b>total raise</b> to
        target. Those choices decide the minimum raise between them, and each
        pushes it in a direction worth understanding:
      </p>
      <ul>
        <li>
          A <b>larger escrow</b> raises the minimum, because the sale has to
          fund it before anything else.
        </li>
        <li>
          A <b>larger liquidity allocation</b> raises the minimum, because more
          tokens have to be paired with cash.
        </li>
        <li>
          A <b>smaller public sale</b> also raises the minimum, and this one is
          less obvious. Selling less of the supply for the same money implies a
          higher price per token, so a higher valuation, so the pool&apos;s
          tokens cost more to pair.
        </li>
      </ul>
      <p>
        From those inputs the protocol computes the rest: the price, the market
        cap, the cash that pairs the pool, and the treasury.{" "}
        <b>The treasury is never chosen.</b> It is whatever remains after the
        pool is paired and escrow is funded. The raise is sized so treasury
        starts at a <b>10% of market cap ask</b>. On-chain, a launch can still
        finalize if conversion slippage lands it as low as <b>8%</b>; below
        that accept floor the sale voids. Combined treasury plus LP cash must
        clear <b>18% of market cap</b>. A creator who wants a deeper treasury
        does not set a number, they raise more: at the ask the treasury sits
        exactly on 10%, and it climbs from there with every extra dollar.
      </p>
      <p>
        <b>Redirecting overflow surplus.</b> In an overflow sale, funds up to the
        target fund the launch exactly as designed: the liquidity pool takes the
        amount that pairs its tokens at the sale price, escrow takes the fixed
        amount the team asked for, and the treasury takes everything left. Beyond
        target, every dollar scales those same proportions, so the listing price
        keeps tracking what buyers actually paid and the treasury keeps its share
        of market cap automatically. Escrow is the exception. Its ask was a fixed
        number, so it has no claim on money raised above target:{" "}
        <b>at least three quarters of the escrow&apos;s surplus share</b> is
        always redirected (a protocol wide minimum, never touching escrow&apos;s
        target funding), and the creator may forego more.
      </p>
      <p>
        <b>Redirected escrow goes to the treasury, in full.</b> There is no
        option to route it into the liquidity pool, and the reason is worth
        understanding. The pool&apos;s token count is fixed at launch, so adding
        cash without adding tokens prices each token higher: the same 2M tokens
        paired with 4M dollars instead of 2M lists at twice the price. That
        sounds like a stronger launch and is the opposite. It <b>lowers</b> the
        backing ratio, because the market cap grows while the reserves do not,
        and it hands a large share of the money to arbitrage traders, who sell
        into the inflated pool on the first day and drain its cash back down
        toward the price the sale cleared at. Cash sitting in a pool can be
        taken by whoever trades against it. Cash in the treasury cannot. The
        treasury route raises backing per token and leaves the listing price
        exactly where buyers set it. Because the 75% minimum is fixed protocol
        wide rather than set per creator, buyers know every overflow sale
        strengthens backing as it fills, which is exactly what makes overflowing
        one worth their while.
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Rule</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Sale window</td>
              <td>
                Creator set, 1 to 60 days. Ends early if the cap fills.
              </td>
            </tr>
            <tr>
              <td>Deposits</td>
              <td>
                Withdrawable in full at any time before the sale concludes. No
                locks, no penalties.
              </td>
            </tr>
            <tr>
              <td>Distribution</td>
              <td>Tokens distribute only at finalization, by claim.</td>
            </tr>
            <tr>
              <td>Minimum raise</td>
              <td>
                <b>Back solved, not guessed.</b> It is the smallest raise that
                pairs the liquidity pool in full, funds the escrow amount the
                team asked for, and still leaves the treasury on its{" "}
                <b>10% of market cap ask</b>. On-chain the accept floor is{" "}
                <b>8%</b> after conversion slippage. With LP cash as secondary
                backing, combined reserves must clear{" "}
                <b>18% of market cap</b>. A team that needs no development funding has
                no minimum at all: whatever it raises pairs the pool and the rest
                becomes treasury. Short of the on-chain gates the launch <b>voids</b>:
                nothing activates and every deposit stays reclaimable forever.
              </td>
            </tr>
            <tr>
              <td>Unsold tokens</td>
              <td>Burned at finalization. Nobody inherits unsold supply.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="note">
        <b>What this means for buyers:</b> until the moment a sale finalizes
        above its minimum, your deposit is yours. A launch that cannot fund its
        own reserves is not allowed to exist.
      </div>
      <p>
        The 10% ask sizes the raise; the 8% accept floor and 18% combined
        backing floor are what the chain enforces. Raise
        above the ask and every extra dollar deepens the reserves: the pool takes the
        share that pairs its tokens at the sale price, and the treasury takes
        everything else. A creator who wants a more resilient token simply
        raises more, or sells more supply. Either way the reserves are seeded
        before the token trades.
      </p>
    </section>
  );
}
