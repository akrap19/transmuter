export function FeesSection() {
  return (
    <section id="fees">
      <h2>Fees</h2>
      <p>
        A transfer fee applies to every trade, set by the creator between{" "}
        <b>0.40% and 2%</b>, split four ways:
      </p>
      <div className="tbl-scroll">
        <table>
          <tbody>
            <tr>
              <th>Portion</th>
              <th>Rate</th>
              <th>What it does</th>
            </tr>
            <tr>
              <td>Liquidity</td>
              <td>min 0.10%</td>
              <td>
                Deepens the token&apos;s reserve pool. The position is contract
                owned; balanced adds, nothing minted.
              </td>
            </tr>
            <tr>
              <td>Treasury</td>
              <td>min 0.10%</td>
              <td>
                Swapped into the backing cToken at settlement. Grows the
                redemption ratio with every trade.
              </td>
            </tr>
            <tr>
              <td>cToken reserve</td>
              <td>
                <span className="fix">FIXED</span> 0.05%
              </td>
              <td>
                Swapped into the backing cToken reserve at settlement. The
                cToken is NonTransferable, so this is not a market buyback.
              </td>
            </tr>
            <tr>
              <td>Protocol</td>
              <td>
                <span className="fix">FIXED</span> 0.15%
              </td>
              <td>Protocol revenue. Not adjustable by anyone.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Two further creator options, both carved from the same transfer fee
        rather than stacked on top. An optional <b>burn fee</b> (0, or 0.05% to
        1%) burns the token&apos;s own supply on every transfer, for creators who
        want their token deflationary by design. An optional <b>creator fee</b>{" "}
        (0, up to 0.5%) pays the creator a share of every trade, the same way
        the protocol takes its own cut; because it comes out of the adjustable
        part of the fee, a creator who takes it simply directs less to backing,
        and it is shown at launch so buyers see it up front. Reserve minting
        carries its own descending premium, described under Mint to Scale below.
      </p>
    </section>
  );
}
