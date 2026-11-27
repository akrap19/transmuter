export function GovernanceSection() {
  return (
    <section id="governance">
      <h2>Governance</h2>
      <p>
        Staked tokens carry voting weight. Unstaked tokens do not. Every quorum is measured against the
        staked supply when a vote opens, and every majority against the votes cast. Votes run 7 days,
        except Mint to Scale votes (24 to 48 hours), end of life votes (30 days), and a council vote on a
        freeze, which closes as soon as its result can no longer change. Thresholds are fixed.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Power</th>
              <th>Who proposes</th>
              <th>What it needs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Halt, resume or advance escrow releases</td>
              <td>holders</td>
              <td>
                halt or resume: 5% quorum, simple majority. Advance: 7% quorum, two-thirds
              </td>
            </tr>
            <tr>
              <td>Retire a reserve asset</td>
              <td>creator, Transmuter, or a 0.1% holder</td>
              <td>5% quorum, two-thirds</td>
            </tr>
            <tr>
              <td>Change the token&apos;s fee rate, within 0.60% to 2.00%</td>
              <td>creator or holders</td>
              <td>
                5% quorum, simple majority. At most three changes in any 12 months. A cut reaches
                redemptions only after a year
              </td>
            </tr>
            <tr>
              <td>Change the annual Mint to Scale budget, within 40% to 100%</td>
              <td>creator or holders</td>
              <td>5% quorum, simple majority</td>
            </tr>
            <tr>
              <td>Replace a price feed</td>
              <td>the token&apos;s creator, or Transmuter directly</td>
              <td>
                creator: a holder vote at 5% quorum, two-thirds. Transmuter: no vote, but a 48-hour
                delay. Only Transmuter replaces the shared SOL/USD and DAO feeds
              </td>
            </tr>
            <tr>
              <td>Brake on an asset whose price feeds have died</td>
              <td>Transmuter</td>
              <td>
                no vote; it can only keep mints stopped. There is no brake on an asset its issuer froze
              </td>
            </tr>
            <tr>
              <td>A treasury draw into escrow</td>
              <td>the creator only</td>
              <td>holders pass at 7% quorum and two-thirds, then the council or Transmuter approves</td>
            </tr>
            <tr>
              <td>Open a Mint to Scale</td>
              <td>
                the creator or a 0.1% holder; for the DAO token, Transmuter or the DAO council
              </td>
              <td>55% of participating staked weight, 3% quorum, and the gate still applies</td>
            </tr>
            <tr>
              <td>Freeze or unfreeze a staked position</td>
              <td>Transmuter, the DAO council or the DAO&apos;s holders</td>
              <td>
                Transmuter plus the council or the DAO&apos;s holders. A council vote on a freeze closes
                as soon as its result can no longer change
              </td>
            </tr>
            <tr>
              <td>End of life</td>
              <td>see above</td>
              <td>
                two parties, one of them the creator or the holders, then two-thirds with a 10% quorum
                over 30 days, stepping to 7% and then 5% after votes that fail for lack of turnout. A
                48-hour wait follows
              </td>
            </tr>
            <tr>
              <td>Stop a passed end of life, or overrule a DAO cancel</td>
              <td>Transmuter</td>
              <td>within the 48-hour wait; it can never start one</td>
            </tr>
            <tr>
              <td>Appoint or remove DAO council members</td>
              <td>Transmuter for now; later the DAO&apos;s holders by election</td>
              <td>handed over once the DAO is ready</td>
            </tr>
            <tr>
              <td>Move a token&apos;s pools to another venue, if the venue is shutting down</td>
              <td>Transmuter</td>
              <td>5% quorum, two-thirds. The new venue must be one the program supports</td>
            </tr>
            <tr>
              <td>Code upgrade</td>
              <td>Transmuter now; later Transmuter plus the DAO council or the DAO&apos;s holders</td>
              <td>protocol-wide, since one program serves every token</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Every power Transmuter holds runs through a 3-of-5 multisig</strong>, so no single key can
        act as Transmuter.
      </p>
      <p>
        <strong>Who can upgrade the code.</strong> The program that holds every token&apos;s reserves can
        be upgraded, so bugs can be fixed and it can keep working as the pool venues it uses change. For
        now that takes Transmuter&apos;s own 3-of-5 multisig, with separate signers from its other powers.
        Later it will take two of three parties, Transmuter, the DAO council and the DAO&apos;s holders,
        with Transmuter always one of the two.
      </p>
      <p>
        The two rates a vote can move, the fee and the mint budget, can only ever move inside fixed
        protocol bounds: 0.60% to 2.00% for the fee and 40% to 100% for the budget. A vote can raise
        either above the figure set at launch, but never past the top of its range.
      </p>
      <h3 id="four-powers-that-deliberately-do-not-exist">
        Four powers that deliberately do not exist
      </h3>
      <p>
        <strong>Nothing can rebalance a basket.</strong> No vote can sell one reserve asset to buy
        another.
      </p>
      <p>
        <strong>Nothing can write a reserve asset off a holder&apos;s claim.</strong> A reserve asset can
        stop receiving new money. What is already held stays redeemable, whatever it is worth.
      </p>
      <p>
        <strong>Nothing can pull escrow out</strong> and move it somewhere else.
      </p>
      <p>
        <strong>Nothing can pause, delay or condition redemption.</strong> Not the creator, not holders,
        not the council, not Transmuter. The only delays are the two staking locks, which apply to staked
        tokens.
      </p>
      <p>
        No vote can hand the reserves to anyone. Winning every governance layer at once still only
        reaches end of life, which pays holders pro rata.
      </p>
    </section>
  );
}
