export function EolSection() {
  return (
    <>
      <section id="what-happens-when-a-project-stops">
        <h2>What happens when a project stops</h2>
        <p>This section is for holders.</p>
        <h3 id="what-you-receive">What you receive</h3>
        <p>
          You do not file a claim. Every holder receives the same share of the reserves per token held,
          whenever they choose to redeem, and that option stays open forever.
        </p>
        <p>What you receive is made of:</p>
        <ul>
          <li>
            <strong>Your share of each reserve asset</strong>, paid in kind, in the assets themselves.
          </li>
          <li>
            <strong>Your share of any USDC not yet converted</strong> into the basket.
          </li>
          <li>
            <strong>Your share of the pools&apos; paired side</strong>, meaning the USDC, SOL or DAO
            tokens your tokens were sitting against. This is not something end of life unlocks. The
            pool&apos;s own tokens have never been claimants, so a live redemption pays the same thing:
            the pool tokens paired against your share burn with yours, and you receive the cash side.
          </li>
          <li>
            <strong>Your share of any unspent escrow</strong>, paid separately in USDC, untaxed.
          </li>
        </ul>
        <h3 id="why-the-figure-is-higher-than-the-reserves-alone-suggest">
          Why the figure is higher than the reserves alone suggest
        </h3>
        <p>
          The tokens sitting inside the pools never claim anything, live or at the end, so the reserves
          are always divided between fewer tokens than the supply figure suggests. Backing is quoted on
          the original supply, so the per-token figure runs ahead of it: around 20% of the listing price
          per claiming token at the enforced minimums, and around 22% at the 10% treasury a raise is
          sized to.
        </p>
        <p>At the end, two further things happen:</p>
        <ul>
          <li>
            <strong>Any unvested team allocation burns.</strong> Investor allocations do not.
          </li>
          <li>
            <strong>Unspent escrow comes back</strong> and is shared out alongside everything else.
          </li>
        </ul>
        <h3 id="what-it-costs-to-redeem">What it costs to redeem</h3>
        <ul>
          <li>The redemption fee, at the highest rate the token has had in the past 12 months.</li>
          <li>The Solana network fee, a fraction of a cent.</li>
          <li>
            Around 0.002 SOL per asset paid out that you have never held before, including the
            pools&apos; SOL, stablecoin or DAO tokens, to open an account for it, refundable if you later
            close it. The interface shows this, because on a tiny position it can exceed the value of
            the smaller assets.
          </li>
          <li>
            If the token runs a DAO pool, the DAO token&apos;s own transfer fee on the DAO tokens you
            receive, since the DAO token carries the same kind of fee.
          </li>
        </ul>
        <h3 id="redeeming-while-it-runs-and-redeeming-at-the-end">
          Redeeming while it runs, and redeeming at the end
        </h3>
        <p>Two different figures, and the dashboard shows both.</p>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>While the project runs</th>
                <th>At end of life</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>What it draws on</strong>
                </td>
                <td>
                  the treasury, any USDC not yet converted <strong>and</strong> the pools
                </td>
                <td>the same, plus any unspent escrow</td>
              </tr>
              <tr>
                <td>
                  <strong>Divided between</strong>
                </td>
                <td>every token not held inside the pools</td>
                <td>the same, after unvested team tokens burn</td>
              </tr>
              <tr>
                <td>
                  <strong>Fee</strong>
                </td>
                <td>the highest rate of the past 12 months, most of it staying in reserves</td>
                <td>
                  the highest rate of the 12 months before the vote, with the retained part going to
                  the DAO
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Live redemption draws on the pools as well as the treasury. When you redeem, your share of the
          pools is withdrawn alongside your share of the treasury, and the pool&apos;s own tokens paired
          against it burn with yours. If the pools hold 20% of supply, redeeming 10% of supply burns
          12.5% of it. Reserves and claiming tokens fall by the same fraction, which is why redeeming
          leaves every remaining holder&apos;s claim exactly where it was, and leaves the price where it
          was too.
        </p>
        <h3 id="what-price-you-are-paid-at">What price you are paid at</h3>
        <p>
          A wind-down does not happen at whatever the market price was when the vote passed. Once
          redemption opens, anyone can buy below the redemption value and redeem for a profit, or sell
          above it. The market price converges on the redemption value, and every holder is paid from
          there. Where the price sits when the vote passes changes how far it travels, not where it
          lands.
        </p>
        <h3 id="how-long-it-takes">How long it takes</h3>
        <p>
          A trouble condition has to hold for about a month before a proposal is allowed: on most days of
          the last 30, the token&apos;s market price has been close to what it redeems for, judged by the
          median of 30 daily readings so a few pumped days change nothing. Once it is met, a proposal can
          be made, and the vote itself takes about a month. So roughly one month from the proposal, and
          up to two months from the first sign of trouble. You can see the figure you would receive
          before any of it begins, and you can redeem at any point throughout.
        </p>
        <h3 id="what-this-does-not-do">What this does not do</h3>
        <p>
          Recovery returns what the reserves hold at the end. It is not reimbursement of what anyone paid
          for the token.
        </p>
      </section>

      <section id="end-of-life">
        <h2>End of life</h2>
        <p>When a project is finished, its holders end it on their terms.</p>
        <p>
          <strong>Proposal.</strong> After the trouble condition has held, an end of life can be proposed
          only when at least <strong>two</strong> parties agree, and at least one of them is{" "}
          <strong>the token&apos;s creator or the token&apos;s holders</strong>. Any holder with 0.1% of
          supply or more can act for the holders. The creator and the holders together also qualify.
        </p>
        <p>
          The other three, Transmuter, the DAO council and the DAO&apos;s holders, act as verification.
          Any of them can be the second party, but none of them, even all three together, can open an end
          of life without the creator or the holders. Transmuter cannot push a project into ending.
        </p>
        <p>
          <strong>The vote</strong> runs 30 days and needs a two-thirds supermajority with a 10% quorum of
          staked supply, because ending a project cannot be undone. Stakers often walk away from a dead
          project, so if a vote fails for lack of turnout, the next one needs a 7% quorum, and after that
          5%. A vote that reaches its quorum but is voted down sets the next one back to 10%. The
          two-thirds majority stays the same at every step. No other vote steps down like this. A failed
          vote can be proposed again straight away.
        </p>
        <p>
          <strong>Cancel and stop.</strong> The DAO council and the DAO&apos;s holders vote in the same
          window, and if both reach two-thirds against a passed end of life, each with a 10% quorum, it is
          cancelled. They can cancel, but they can never end a project its holders voted to keep. A passed
          vote then waits 48 hours before anything happens. In that time Transmuter can stop it, or can
          overrule a DAO cancel so the holders&apos; decision stands, in case the DAO token itself is ever
          taken over. Transmuter cannot start or force an end of life.
        </p>
        <p>
          <strong>If price reads die.</strong> If the token&apos;s own price reads have been down for 10
          days straight, holders can open the trouble condition themselves, at two-thirds of votes cast
          with a 7% quorum, in a one-week window. That only allows a proposal, so a token whose prices
          have gone dark can still reach end of life. Transmuter can also open the trouble condition to
          clear a deadlock, which likewise only allows a proposal. So does an escrow halt that holders
          passed, for as long as it stays in force.
        </p>
        <p>
          <strong>Execution, in this order:</strong>
        </p>
        <ol>
          <li>Unvested team allocation burns. Investor allocations do not.</li>
          <li>Unspent escrow comes back.</li>
          <li>
            The pools unwind: their tokens burn so the pools stop trading, and their cash, already
            counted in reserves, is paid out.
          </li>
          <li>
            The end of life fee is taken on total reserves, including unconverted USDC, and never on
            escrow.
          </li>
          <li>
            Everything left is paid out pro rata, in the assets themselves, with the escrow as its own
            USDC part.
          </li>
        </ol>
        <p>
          The order matters: the team burn changes the token count, so it has to happen before the fee and
          the payout are worked out.
        </p>
        <div className="note">
          <strong>Redemption does not change shape and does not close.</strong> Holders can redeem before,
          during and after. Once the vote passes, redemptions use the same rate as the end of life payout,
          the highest of the 12 months before the vote. The other change is the destination: once the vote
          passes, the parts that used to stay in reserves go to the DAO token&apos;s reserves instead, and
          transfers redirect the same way, with Transmuter keeping 0.20% and every other share going to
          the DAO.
        </div>
        <p>
          There is no moment at which redemption is suspended pending liquidation, so no holder has a
          reason to race anyone else to the exit.
        </p>
      </section>
    </>
  );
}
