export function StakingSection() {
  return (
    <section id="staking">
      <h2>Staking</h2>
      <p>Staking is a change of custody, not a change of owner, and it is free in both directions.</p>
      <p>
        It carries <strong>governance weight</strong>, and that is what it is for. There is no staking
        reward.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Voting weight</td>
              <td>Fixed when a vote opens, so a vote is decided on the rules it started under.</td>
            </tr>
            <tr>
              <td>Return address</td>
              <td>Tokens only ever return to the wallet that staked them.</td>
            </tr>
            <tr>
              <td>Redemption</td>
              <td>
                Staked tokens still count as claiming tokens, so they keep their full claim on the
                reserves.
              </td>
            </tr>
            <tr>
              <td>Voter lock</td>
              <td>
                An address that has voted cannot unstake the position that carried that vote until a week
                after the vote resolves. That binds unstaking only, never transfers of an unstaked
                balance.
              </td>
            </tr>
            <tr>
              <td>Governance freeze</td>
              <td>
                Transmuter, together with either the DAO council or the DAO&apos;s holders, can freeze a
                staked position believed to be attack capital. Nothing can be frozen without Transmuter.
                It loses its live voting weight and cannot be unstaked. Nothing is ever burned or taken.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Both the voter lock and a freeze delay redemption for that position while they last, which is the
        one place anything delays a redemption at all. Unstaking first is always available otherwise.
      </p>
    </section>
  );
}
