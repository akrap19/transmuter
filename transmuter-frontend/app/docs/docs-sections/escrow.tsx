export function EscrowSection() {
  return (
    <section id="escrow">
      <h2>Raise Protection</h2>
      <p>
        The reserve protects a holder&apos;s downside even if a team walks away.
        But the funds a project raises for development are a separate pot, and a
        team disappearing with that runway is one of the most common failures in
        the space. Transmuter closes that gap: development funds lock in a{" "}
        <b>non-custodial escrow</b> at launch and release to the team in vested
        tranches, enforced by contract. A team can fund real work but cannot take
        the runway in a single move.
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Rule</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Custody</td>
              <td>
                Non-custodial. The escrow is held by the token&apos;s contracts,
                not by the team and not by us. The team can never pull it early
                on its own; only a governance vote can advance a tranche, and
                only when a project genuinely needs it.
              </td>
            </tr>
            <tr>
              <td>Release</td>
              <td>
                Vested in tranches over a window the creator fixes at launch. No
                tranche can be pulled forward by the team, so the runway cannot
                be drained at once.
              </td>
            </tr>
            <tr>
              <td>Milestone gating</td>
              <td>
                Optional. A creator can opt into milestone based unlocks instead
                of a pure time lock, for a stronger trust signal.
              </td>
            </tr>
            <tr>
              <td>Governance control</td>
              <td>
                Governance can release the next tranche early when a project
                genuinely needs it, halt release if a creator acts in bad faith,
                and on a confirmed finding of bad faith return the remaining
                runway to the token&apos;s own treasury, where it lifts backing
                for holders. The same return happens automatically if the token
                reaches end of life.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="note">
        <b>Why it matters:</b> accepting the lock is itself the signal. Serious
        builders take it, and the teams who would not are exactly the ones
        holders need filtered out.
      </div>
    </section>
  );
}
