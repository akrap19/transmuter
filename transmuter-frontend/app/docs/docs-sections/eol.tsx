export function EolSection() {
  return (
    <>
      <section id="what-happens-when-a-project-stops">
        <h2>What Happens When a Project Stops</h2>
        <p>This section is for holders.</p>
        <h3 id="what-you-receive">What you receive</h3>
        <p>
          You do not file a claim. Every holder receives the same share of the reserves per token
          held, whenever they choose to redeem, and that option stays open forever.
        </p>
        <p>What you receive is made of three things:</p>
        <ul>
          <li>
            <strong>Your share of the treasury</strong>, paid in the base asset, such as SOL.
          </li>
          <li>
            <strong>Your share of the pools&apos; cash side.</strong> When the project ends, both
            pools unwind, their cash is converted into the treasury, and their tokens burn.
          </li>
          <li>
            <strong>Your share of any unspent escrow</strong>, paid separately in USDC.
          </li>
        </ul>
        <h3 id="why-the-figure-is-higher-than-the-treasury-alone">
          Why the figure is higher than the treasury alone
        </h3>
        <p>At the end, two things shrink the number of tokens sharing the reserves:</p>
        <ul>
          <li>
            <strong>The pools&apos; own tokens burn.</strong> They held a large share of supply, and
            none of it claims anything.
          </li>
          <li>
            <strong>Any unvested team allocation burns.</strong> Investor allocations do not.
          </li>
        </ul>
        <p>
          So the reserves are divided between fewer tokens than circulated while the project was
          live.
        </p>
        <h3 id="live-and-end-of-life-redemption">Live and end of life redemption</h3>
        <p>These are two different figures, and the dashboard shows both.</p>
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
                <td>The treasury only</td>
                <td>The treasury, the pools&apos; cash and any unspent escrow</td>
              </tr>
              <tr>
                <td>
                  <strong>Divided between</strong>
                </td>
                <td>Every token in circulation</td>
                <td>Only the tokens that survive the burn</td>
              </tr>
              <tr>
                <td>
                  <strong>Fee</strong>
                </td>
                <td>0.50%</td>
                <td>None</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The gap between them is usually large. Most of what a holder is owed sits behind the end
          of life figure.
        </p>
        <h3 id="what-price-you-are-paid-at">What price you are paid at</h3>
        <p>
          A wind-down does not happen at whatever the market price was when the vote passed. Once
          redemption opens, anyone can buy below it and redeem for a profit, or sell above it. The
          market price converges on the redemption value, and every holder is paid from there. Where
          the price sits when the vote passes changes how far it travels, not where it lands.
        </p>
        <h3 id="how-long-it-takes">How long it takes</h3>
        <p>
          About two months from vote to payout. You can see the figure you would receive before any
          of it begins.
        </p>
        <h3 id="what-this-does-not-do">What this does not do</h3>
        <p>
          Recovery returns what the reserves hold at the end. It is not reimbursement of what anyone
          paid for the token.
        </p>
      </section>

      <section id="end-of-life">
        <h2>End of Life</h2>
        <p>When a project is finished, its holders end it on their terms.</p>
        <p>
          <strong>1. Proposal.</strong> An end of life can be proposed only when at least{" "}
          <strong>two</strong> parties agree, and at least one of them is{" "}
          <strong>the token&apos;s creator or the token&apos;s holders</strong>. The creator and the
          holders together also qualify.
        </p>
        <p>
          The other three, Transmuter, the DAO council and the DAO&apos;s holders, act as
          verification. Any of them can be the second party, but none of them, even all three
          together, can open an end of life without the creator or the holders.
        </p>
        <p>
          Holders are not required, so a token cannot get stuck just because its holders never act.
          No single party can open one, and no single party can block one: if the creator refuses,
          the holders and a verifier can proceed, and the other way round.
        </p>
        <p>
          <strong>2. Vote.</strong> A 14-day vote of staked weight decides, needing a{" "}
          <strong>67% supermajority</strong> with a <strong>10% quorum</strong>, resolved at the end
          of the window.
        </p>
        <p>
          <strong>3. DAO circuit breaker.</strong> The DAO votes at the same time, not afterwards.
          The holder outcome stands unless <strong>both</strong> DAO bodies, each independently at
          67%, land against it. One body is never enough. This is what answers a hostile takeover:
          if someone buys enough supply to hold a token hostage, the two bodies together can still
          wind it down. Because an end of life only ever distributes pro rata, even an override pays
          every holder their fair share and seizes nothing.
        </p>
        <p>
          Transmuter&apos;s founders hold a <strong>cancel-only</strong> veto, checked at execution.
          It can stop an end of life, and cannot force one. It also runs against the founders&apos;
          own interest: Transmuter earns a share of the end of life fee, so using the veto costs
          them.
        </p>
        <p>
          <strong>4. Execution.</strong> Anyone can trigger it. Pending fees settle, any unvested
          team allocation burns, both pools unwind, their tokens burn and their cash is converted
          into the treasury, the end of life fee is charged, and minting closes forever.
        </p>
        <p>
          After that, <strong>redemption stays open forever</strong>, free of fees, at the final
          redemption ratio.
        </p>
        <h3 id="ctoken-end-of-life">cToken end of life</h3>
        <p>
          A <strong>pure cToken has no end of life</strong>, because there is nothing to add: its
          holders can always redeem the base asset.
        </p>
        <p>
          A <strong>cToken with a gold contingency</strong> has one, and it does exactly one thing:
          if the base asset suffers a verified, sustained collapse, both DAO bodies at a 67%
          supermajority, with a quorum of 10% of circulating supply, can open the gold. That{" "}
          <strong>adds</strong> a second way to redeem. Before it, a holder redeems for the base
          asset. After it, they can choose the base asset or gold. The base asset redemption never
          closes, nothing is seized, and no balance changes.
        </p>
        <p>
          Triggering it falsely gains an attacker nothing. Their reward would be the right to swap
          an asset they could already redeem for gold, at a rate deliberately worse for them, while
          everyone else carries on as before. The gold pays pro rata, so reaching all of it would
          mean owning every token, which is not an exploit but a purchase.
        </p>
      </section>
    </>
  );
}
