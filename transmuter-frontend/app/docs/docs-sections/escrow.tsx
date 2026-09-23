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
                In tranches over a schedule the creator fixes at launch, by time or by milestone.
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
                Unspent escrow is <strong>paid to holders pro rata, in USDC</strong>, alongside
                their share of the treasury. It is not converted and not taxed.
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
        <strong>Why it matters:</strong> accepting the escrow is itself the signal. Serious builders
        take it, and teams who will not are exactly the ones holders need filtered out.
      </p>
    </section>
  );
}
