export function FeesSection() {
  return (
    <section id="fees">
      <h2>Fees</h2>
      <h3 id="the-transfer-fee">The transfer fee</h3>
      <p>
        Every trade pays a transfer fee, set by the creator between <strong>0.40% and 2%</strong>.
        Going above 1% is not recommended; the upper range exists for experimental products.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Portion</th>
              <th>Rate</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Liquidity</td>
              <td>min 0.10%</td>
              <td>Deepens the token&apos;s contract-owned liquidity.</td>
            </tr>
            <tr>
              <td>Treasury</td>
              <td>min 0.10%</td>
              <td>
                Converted into the token&apos;s cToken. Grows the redemption ratio with every
                trade.
              </td>
            </tr>
            <tr>
              <td>cToken reserve</td>
              <td>fixed 0.05%</td>
              <td>
                Added to the cToken&apos;s reserve: its base asset for a pure cToken, or its gold
                for one with a gold contingency.
              </td>
            </tr>
            <tr>
              <td>Protocol</td>
              <td>0.15%</td>
              <td>Protocol revenue.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Two optional creator settings are carved from the same fee rather than stacked on top: a{" "}
        <strong>burn fee</strong> (0, or 0.05% to 1%) that makes the token deflationary, and a{" "}
        <strong>creator fee</strong> (0, up to 0.5%). Both are shown before launch.
      </p>
      <p>
        <strong>The full fee a holder pays is the creator-set total, 0.40% to 2%.</strong> The 0.15%
        is Transmuter&apos;s share inside it.
      </p>
      <h3 id="what-transmuter-earns">What Transmuter earns</h3>
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
              <td>0.15%</td>
            </tr>
            <tr>
              <td>Every ordinary redemption</td>
              <td>0.15%</td>
            </tr>
            <tr>
              <td>Every cToken mint</td>
              <td>0.25%</td>
            </tr>
            <tr>
              <td>Every Mint to Scale</td>
              <td>0.25%</td>
            </tr>
            <tr>
              <td>End of life</td>
              <td>0.25%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Protocol governance can move fees only within bounds set before launch.</p>
      <h3 id="redemption">Redemption</h3>
      <p>
        Holders can redeem at any time. An ordinary redemption, while the project is running, pays a{" "}
        <strong>0.50%</strong> fee: 0.15% to the protocol, and{" "}
        <strong>0.35% that stays in the treasury</strong>, raising the redemption ratio for everyone
        who remains. After end of life, redemption is free.
      </p>
      <h3 id="reserve-conversion">Reserve conversion</h3>
      <p>When a treasury converts its proceeds into cTokens, a fee is taken from those proceeds.</p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>cToken</th>
              <th>Fee</th>
              <th>To the base asset</th>
              <th>To gold</th>
              <th>To Transmuter</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pure</td>
              <td>1.25%</td>
              <td>1.00%</td>
              <td>·</td>
              <td>0.25%</td>
            </tr>
            <tr>
              <td>With gold contingency</td>
              <td>1.50%</td>
              <td>0.25%</td>
              <td>1.00%</td>
              <td>0.25%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>The minimum raise already includes this cost, so it cannot void a launch.</p>
      <h3 id="end-of-life">End of life</h3>
      <p>
        When a project ends, a fee of <strong>1.25%</strong> is charged on its treasury:{" "}
        <strong>0.25%</strong> to Transmuter and <strong>1.00%</strong> added to the cToken&apos;s
        own reserve, in its base asset for a pure cToken or in gold for one with a contingency. It
        is never charged on the USDC escrow.
      </p>
      <p>
        This is a real cost to the project that ends. It is also how the reserve layer is built for
        the projects that come after: nobody pays for access to it up front, and each project
        protected by it on the way through adds to it on the way out.
      </p>
      <p>
        <strong>For launch platforms using Transmuter&apos;s infrastructure,</strong> these figures
        are Transmuter&apos;s own. A platform can add its own fee on top.
      </p>
    </section>
  );
}
