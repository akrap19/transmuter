export function EscrowSection() {
  return (
    <section id="escrow">
      <h2>Escrow</h2>
      <p>
        The treasury protects holders if a team walks away. The funds a project raises for
        development are a separate pot, and a team disappearing with its runway is one of the most
        common failures in the space. Transmuter closes that gap.
      </p>
      <p>
        Escrow is <strong>optional</strong>. A project that needs no runway can launch without one,
        and then every dollar raised above the pool pairing goes to the treasury.
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
              <td>USDC, for stability. Non-custodial, held by the token&apos;s own contracts.</td>
            </tr>
            <tr>
              <td>Release</td>
              <td>
                Milestone tranches release on their schedule. If the work defined in a milestone is
                not delivered, holders can pause the escrow. Teams choosing milestones are expected
                to show proof of development.
              </td>
            </tr>
            <tr>
              <td>The schedule</td>
              <td>
                <strong>Cannot be rewritten by anyone</strong> after launch: not the team, not
                holders, not Transmuter.
              </td>
            </tr>
            <tr>
              <td>Holders can</td>
              <td>
                Halt releases if a team acts in bad faith, resume them, and vote to advance the next
                tranche when a project genuinely needs it.
              </td>
            </tr>
            <tr>
              <td>If the project ends</td>
              <td>
                Unspent escrow converts into the reserve asset, joins the treasury, and is redeemed
                with it.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        There is no vote that can pull escrow out and move it anywhere else. A power like that would
        reward sabotaging a working project to reach its money. Halting releases hurts a team that
        is not delivering without paying anyone to cause it.
      </p>
      <p>
        <strong>Why it matters:</strong> a team that raises money for development and refuses to
        hold it in escrow is the case this filter exists for. A team that needs no runway launches
        without one.
      </p>
    </section>
  );
}
