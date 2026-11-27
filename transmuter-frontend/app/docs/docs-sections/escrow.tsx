export function EscrowSection() {
  return (
    <section id="escrow">
      <h2>Escrow</h2>
      <p>
        The reserves protect holders if a team walks away. The funds a project raises for development are
        a separate pot, and a team disappearing with its runway is one of the most common failures in the
        space. Transmuter closes that gap.
      </p>
      <p>
        Escrow is <strong>optional</strong>. A project that needs no runway can launch without one, and
        then every dollar above the pool pairing goes to the treasury.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Held in</td>
              <td>
                USDC, for stability. Non-custodial, held by the token&apos;s own contracts. No conversion
                at any point.
              </td>
            </tr>
            <tr>
              <td>Release</td>
              <td>
                Automatically, on a schedule the creator fixes at launch. There is always a schedule, so
                the runway is never released in one go, and at most half of it can be released at
                finalisation. Nothing needs approving.
              </td>
            </tr>
            <tr>
              <td>Milestones</td>
              <td>
                Published by the project so holders can judge whether it is delivering. The contract
                cannot check work, so it does not enforce them.
              </td>
            </tr>
            <tr>
              <td>The schedule</td>
              <td>
                <strong>Cannot be rewritten by anyone</strong> after launch: not the team, not holders,
                not Transmuter.
              </td>
            </tr>
            <tr>
              <td>Holders can</td>
              <td>
                <strong>Halt</strong> releases if a team acts in bad faith, <strong>resume</strong> them
                once the issue is resolved, and vote to <strong>advance</strong> the next tranche when a
                project genuinely needs it. Nobody else has any power over the escrow.
              </td>
            </tr>
            <tr>
              <td>If the project ends</td>
              <td>
                Unspent escrow is <strong>paid to holders pro rata, in USDC</strong>, as its own part of
                the payout. It is not converted and the end of life fee is never charged on it.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Escrow is not redeemable while the token is live, so a large escrow ask or an aggressive release
        schedule means less behind each token in the meantime. It is not lost either: holders can halt
        releases, and if a team acts in bad faith holders can end the project, which returns every unspent
        dollar to them. Escrow already released cannot be clawed back.
      </p>
      <p>
        There is no vote that can pull escrow out and move it somewhere else. A power like that would
        reward sabotaging a working project to reach its money. Halting releases hurts a team that is not
        delivering without paying anyone to cause it, and resuming restores the schedule exactly as it
        was.
      </p>
      <p>
        <strong>Why it matters:</strong> accepting the escrow is itself the signal. Serious builders take
        it, and teams who will not are exactly the ones holders need filtered out.
      </p>
      <h3 id="a-treasury-draw-into-escrow">A treasury draw into escrow</h3>
      <p>
        A project that runs short of cash can ask holders to move a bounded amount of reserves into
        escrow. This runs the other way to the rule above: it adds to escrow rather than taking from it.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Cap</strong>
              </td>
              <td>
                up to 10% of the treasury, named as a dollar amount: what the escrow receives. The cost of
                selling reserve assets into USDC comes on top, out of the treasury
              </td>
            </tr>
            <tr>
              <td>
                <strong>How often</strong>
              </td>
              <td>once per rolling year</td>
            </tr>
            <tr>
              <td>
                <strong>Drawn from</strong>
              </td>
              <td>
                the treasury only, never the pools, and never the USDC set aside to pair into them
              </td>
            </tr>
            <tr>
              <td>
                <strong>Released</strong>
              </td>
              <td>
                on its own schedule, named in the proposal and voted on with it. Never all at once, and at
                most half when the draw executes
              </td>
            </tr>
            <tr>
              <td>
                <strong>Who proposes</strong>
              </td>
              <td>the creator</td>
            </tr>
            <tr>
              <td>
                <strong>Who approves</strong>
              </td>
              <td>holders pass it, then the DAO council or Transmuter approves</td>
            </tr>
            <tr>
              <td>
                <strong>Available to</strong>
              </td>
              <td>serious projects, not memecoin launches</td>
            </tr>
            <tr>
              <td>
                <strong>Fee</strong>
              </td>
              <td>none</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        This is the one ordinary power that lowers the redemption value, and it is presented to holders as
        exactly that: a transfer from their claim into the project&apos;s runway. The draw is taken pro
        rata across every reserve asset in the treasury that can move, USDC not yet converted included,
        since taking it from one asset would be rebalancing by vote. Because escrow is held in USDC, the
        draw has to sell reserve assets, and that cost comes out of the treasury, so the escrow receives
        exactly the amount named. Holders see the full reserve reduction including that cost before they
        vote, not just the headline figure. If prices move between the vote and the payout so the amount
        would exceed the cap, it is cut back rather than cancelled.
      </p>
    </section>
  );
}
