export function MintToScaleSection() {
  return (
    <section id="minttoscale">
      <h2>Mint to Scale</h2>
      <p>
        If a token&apos;s backing thins, the protocol can rebuild it. One event
        type, two ways to open it. Every event prices the same way: a capped
        amount of new supply becomes mintable at the token&apos;s{" "}
        <b>market price plus a premium</b>, charged at the higher of a
        manipulation-resistant snapshot (a 6-hour time-averaged, dual-oracle
        read) or the live price, so a mint can never be cheaper than simply
        buying on the open market. The premium opens high, around <b>20%</b>, and
        decays down to a <b>3% minimum</b>, a descending auction that discovers a
        fair rate: buyers mint once it falls far enough to beat the market after
        slippage. Because every mint pays above market into the treasury, each one
        deposits more than the existing per token claim, so backing and the
        redemption ratio both rise, and the premium itself accrues to the reserve.
        Supply grows, but each token ends up better backed, never diluted.
      </p>
      <h3>Automatic path</h3>
      <p>
        If the backing ratio stays below the creator&apos;s{" "}
        <b>activation threshold</b> (set between 5% and 17%){" "}
        <b>continuously for 6 hours</b>, an event opens by itself for up to a
        flat 15% of supply, snapshotted at open, with no vote and no creator
        action. It closes again once backing climbs back above a higher{" "}
        <b>deactivation threshold</b> (set between 20% and 35%). The gap between
        the two, always at least 10 points, is a deadband that stops the event
        flapping on and off around a single line. The 6-hour continuity
        requirement is the manipulation defense: no flash loan survives it, and
        that same 6-hour read prices the mint.
      </p>
      <h3>Governance path</h3>
      <p>
        Holders can vote an event open for strategic cases: an{" "}
        <b>ambassador</b> proposes a percentage between <b>5% and 15%</b>,
        approval needs <b>55% of participating staked weight</b> with a{" "}
        <b>3% quorum</b>, and the vote runs for a creator set window of{" "}
        <b>24 to 48 hours</b>. Because a Mint to Scale only ever adds fresh,
        fully backed supply and can never remove value from anyone, the
        token&apos;s holders decide it alone, with no DAO overturn.
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Limit</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Automatic events</td>
              <td>Max 3 per rolling year, minimum 60 days apart</td>
            </tr>
            <tr>
              <td>Governance events</td>
              <td>Max 3 per rolling year, count capped regardless of size</td>
            </tr>
            <tr>
              <td>Lockout</td>
              <td>No event of any kind opens while backing is at or above 50%</td>
            </tr>
            <tr>
              <td>Slot use</td>
              <td>
                An event counts against the yearly limit only if it mints more
                than 25% of its allowance, so a near-instant recovery does not
                waste a slot
              </td>
            </tr>
            <tr>
              <td>Concurrency</td>
              <td>One open event at a time, across both paths</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
