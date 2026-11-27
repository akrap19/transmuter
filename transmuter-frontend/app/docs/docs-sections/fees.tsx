export function FeesSection() {
  return (
    <section id="fees">
      <h2>Fees</h2>
      <p>
        A token carries <strong>one fee rate at a time</strong>, set by the creator between{" "}
        <strong>0.60% and 2.00%</strong> at launch. Transfers pay the current rate. Redemptions pay the
        highest rate the token has had in the 12 months before the redemption, and the end of life payout
        the highest of the 12 months before the end of life vote. While the rate stays put, all three are
        the same. The rate can be changed later by proposal and a holder vote, at most three times in any
        12 months, taking effect about four days after the vote, but only ever inside those same bounds,
        so the most it can ever reach is 2.00%, whatever it was at launch. A raise reaches transfers and
        redemptions together; a cut reaches transfers straight away and redemptions only once the higher
        rate is a year old.
      </p>
      <p>Going above 1% is not recommended; the upper range exists for experimental products.</p>
      <div className="note">
        <strong>Most of what is collected never reaches Transmuter.</strong> It goes back into the
        reserves behind the token, which is to say it works for holders. Every charge is capped and
        disclosed before you buy.
      </div>
      <p>
        <strong>Why one rate everywhere.</strong> If redeeming early were cheaper than waiting for the end
        of life payout, holders would redeem early to dodge the difference. With one rate there is
        nothing to dodge, and holders who wait still receive more, because end of life adds unspent escrow
        and burns unvested team tokens. Redemptions and the end of life payout both pay the highest rate
        of the past 12 months, so voting the rate down beforehand gains nothing: a holder cannot cut the
        rate and then leave cheaply.
      </p>
      <h3 id="the-transfer-fee">The transfer fee</h3>
      <p>
        Taken in the token itself, on every transfer, not only on pool trades. The first 0.60% always
        splits the same way.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Share</th>
              <th>Amount</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DAO buy-and-burn</td>
              <td>0.10%</td>
              <td>Swapped to DAO tokens in batches and burned.</td>
            </tr>
            <tr>
              <td>Protocol</td>
              <td>0.20%</td>
              <td>Transmuter&apos;s revenue, at every total.</td>
            </tr>
            <tr>
              <td>Treasury</td>
              <td>0.15%</td>
              <td>Buys reserve assets. Raises the redemption value with every trade.</td>
            </tr>
            <tr>
              <td>Pools</td>
              <td>0.15%</td>
              <td>Deepens the token&apos;s own pools, following the launch pair split.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Anything above 0.60% is <strong>the extra</strong>, and the creator splits it between four
        destinations at launch. Transmuter and the DAO never receive any part of the extra.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Destination</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Treasury</td>
              <td>More reserve assets.</td>
            </tr>
            <tr>
              <td>Pools</td>
              <td>Deeper pools.</td>
            </tr>
            <tr>
              <td>Burn</td>
              <td>Destroys supply, raising the redemption value for everyone left.</td>
            </tr>
            <tr>
              <td>Creator</td>
              <td>Creator income.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        At 1.00%, for example, the extra is 0.40%, which a creator might split as 0.20% to themselves,
        0.10% to burn and 0.10% to the treasury. Every split must add up exactly to what it splits, or the
        token does not deploy.
      </p>
      <p>
        A trade against the SOL or stablecoin pool pays the fee once, on whoever makes the trade. A trade
        against a DAO pool pays it on both tokens, since the DAO token carries the same kind of fee.{" "}
        <strong>The pools never pay it</strong>, which is what keeps a token&apos;s own fee off its
        reserves.
      </p>
      <h3 id="redemption">Redemption</h3>
      <p>
        Holders can redeem at any time. A burn is not a transfer, so the transfer fee never fires on a
        redemption. Instead the redemption keeps back the highest rate the token has had in the past 12
        months from what it pays out, in the assets themselves, so no price is needed.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>
                Rate charged (the highest of the past 12 months before the vote, the end of life rate
                after)
              </th>
              <th>Before an end of life vote</th>
              <th>After the vote</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0.60%</td>
              <td>0.20% protocol, 0.10% DAO, 0.30% stays in reserves</td>
              <td>0.20% protocol, 0.40% to the DAO</td>
            </tr>
            <tr>
              <td>1.00%</td>
              <td>0.20% protocol, 0.10% DAO, 0.70% stays in reserves</td>
              <td>0.20% protocol, 0.80% to the DAO</td>
            </tr>
            <tr>
              <td>2.00%</td>
              <td>0.20% protocol, 0.10% DAO, 1.70% stays in reserves</td>
              <td>0.20% protocol, 1.80% to the DAO</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Any DAO tokens in the DAO&apos;s part are burned; the rest joins the DAO token&apos;s reserves. On
        the DAO token itself there is nowhere else for that part to go, so it simply stays in its own
        reserves.
      </p>
      <p>
        What stays in reserves raises the redemption value slightly for everyone who remains. After an end
        of life vote passes, redemptions use the same rate as the end of life payout: the highest rate of
        the 12 months before the vote.
      </p>
      <h3 id="mint-to-scale-fee">Mint to Scale</h3>
      <p>
        <strong>0.25%, charged on top of what the minter pays</strong>, so the whole of the mint proceeds
        reaches the reserves. A buyer paying for 100 pays 100.25, and all 100 lands in reserves. Taking it
        out of the proceeds would work against the point of the instruction.
      </p>
      <h3 id="end-of-life-fee">End of life</h3>
      <p>
        Charged once, at the highest rate the token has had in the 12 months before the end of life vote
        passed, on total reserves at the payout, including USDC still waiting to be converted.{" "}
        <strong>It is never charged on the escrow USDC.</strong> Transmuter&apos;s share is 0.20% and the
        rest goes to the DAO token: any DAO tokens in it are burned, and everything else joins its
        reserves. On the DAO token itself, the rest stays with its own holders, so its end of life fee is
        Transmuter&apos;s 0.20% only.
      </p>
      <p>
        Unwinding the positions also costs roughly 0.5% in market slippage, which no instruction collects.
      </p>
      <h3 id="staking-fee">Staking</h3>
      <p>
        <strong>Free in both directions.</strong> Voting weight lives in the staking contract, and a fee
        on entering or leaving it would be a toll on taking part in governance.
      </p>
      <h3 id="what-transmuter-earns">What Transmuter earns</h3>
      <p>Four lines, and nothing else in the system is protocol revenue.</p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Transmuter&apos;s share</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Every transfer</td>
              <td>0.20%</td>
            </tr>
            <tr>
              <td>Every redemption before an end of life vote</td>
              <td>0.20%</td>
            </tr>
            <tr>
              <td>Redemptions after the vote, and the end of life payout</td>
              <td>0.20%</td>
            </tr>
            <tr>
              <td>Every Mint to Scale</td>
              <td>0.25%, on top</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Transmuter earns nothing at launch, and nothing from a project that quietly goes nowhere. Protocol
        governance can move fees only within bounds set before launch. Transmuter can change its own 0.20%
        share for future launches, up to 0.50%, but never raise it on a token that is already live; a cut
        reaches every token. For launch platforms building on Transmuter, these figures are
        Transmuter&apos;s own and a platform can add its own fee on top.
      </p>
    </section>
  );
}
