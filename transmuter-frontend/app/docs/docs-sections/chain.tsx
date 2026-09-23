export function ChainSection() {
  return (
    <section id="reserve-assets">
      <h2>Reserve Assets</h2>
      <p>
        A cToken wraps a base asset. Its job is to let everything standing behind an EOL token read
        as one figure, and to make that figure grow.
      </p>
      <h3 id="what-the-ctoken-does">What the cToken does</h3>
      <p>
        Each cToken holds its base asset in an isolated reserve. An EOL token&apos;s treasury holds
        cTokens, and a holder who redeems receives the base asset those cTokens represent.
      </p>
      <p>
        The cToken&apos;s backing per token <strong>never falls</strong>. Every operation that
        touches it either raises backing per token or leaves it unchanged:
      </p>
      <ul>
        <li>
          <strong>When a treasury mints cTokens</strong>, a fee is taken from what it deposits, and
          part of that fee stays in the reserve. Backing per cToken rises.
        </li>
        <li>
          <strong>When a holder redeems</strong>, cTokens burn and exactly their share of the
          reserve leaves. Backing per cToken is unchanged.
        </li>
        <li>
          <strong>Fee contributions</strong> from every EOL token built on it enter the reserve
          without creating any new cTokens. Backing per cToken rises.
        </li>
      </ul>
      <p>
        Because the cToken is shared, every project built on it strengthens it. Each project&apos;s
        treasury is its own, and nothing is pooled or cross-collateralised. What is shared is the
        reserve layer underneath, so <strong>every project that ends here leaves the next one
        stronger.</strong>
      </p>
      <h3 id="why-a-system-token">Why a system token</h3>
      <p>
        A cToken is a record of reserves, not something to speculate on. If anyone could mint one,
        they could enter a reserve at the last moment and claim value that others spent years
        building. If it could be traded, its price could drift away from what actually backs it and
        be pushed around. So only an EOL token&apos;s own contract can mint one, straight into its
        own treasury, and once minted it cannot move. That closes both routes completely.
      </p>
      <h3 id="two-variants">Two variants</h3>
      <p>
        A project chooses its cToken at launch. There are two kinds, and they are{" "}
        <strong>separate tokens</strong>, not settings on one token.
      </p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Examples</th>
              <th>What stands behind it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Pure</strong>
              </td>
              <td>cSOL, cBTC, cGold</td>
              <td>Its base asset only.</td>
            </tr>
            <tr>
              <td>
                <strong>With secondary gold contingency</strong> (optional)
              </td>
              <td>cSOL or cBTC, each with gold</td>
              <td>
                The same base asset first, plus a separate reserve of tokenised gold that opens only
                if the base asset itself collapses.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Gold is optional. A project picks one version or the other at launch.</p>
      <p>
        <strong>The trade off is efficiency against an extra layer of safety.</strong> In the gold
        contingency variant, more than half of every fee bound for the reserve goes to gold rather
        than to the base asset. The base asset reserve therefore grows more slowly than it would in
        the pure variant. In return, holders have a fallback that does not depend on crypto markets
        at all.
      </p>
      <p>
        A pure cToken puts every reserve-bound fee into its base asset, so it scales fastest, and it
        carries no second layer.
      </p>
      <p>
        <strong>cGold</strong> is a pure cToken whose base asset is tokenised gold. Gold is its
        first and only reserve, and it is always redeemable, the same as SOL is for cSOL.
      </p>
      <h3 id="the-gold">The gold</h3>
      <p>
        Gold in the contingency variant is a third-party tokenised gold asset on Solana, chosen for
        liquidity depth and issuer credibility. Issuing Transmuter&apos;s own tokenised gold is
        under consideration for a later stage.
      </p>
      <p>
        In the contingency variant, gold belongs to the cToken, not to any EOL token. When an EOL
        token reaches end of life, its holders are paid in the base asset, and the gold stays behind
        the cToken for as long as the base asset holds. It is claimable only if the base asset itself
        fails, and only by reserves that were in place before that failure began, so nobody can
        enter late and claim gold that others built.
      </p>
    </section>
  );
}
