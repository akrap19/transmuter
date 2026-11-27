export function TokensSection() {
  return (
    <section id="token-types">
      <h2>Token types</h2>
      <p>Two token types make up the protocol.</p>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>What it is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>EOL token</strong>
              </td>
              <td>
                <strong>End of life token.</strong> The token a project launches. It trades like any
                other token, and it carries reserves it holds directly plus a defined end of life
                procedure.
              </td>
            </tr>
            <tr>
              <td>
                <strong>DAO token</strong>
              </td>
              <td>
                <strong>Protocol governance token.</strong> Staking it sets voting weight over
                protocol-wide decisions. It is an EOL token itself, backed by its own reserves, and a
                share of every launched token&apos;s fees buys DAO tokens and burns them.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        There is no intermediary reserve instrument between a token and its assets. A token holds its
        reserves directly, so redeeming hands you those assets rather than a claim on something else
        that holds them.
      </p>
      <h3 id="the-dao-token-and-the-fee-that-feeds-it">
        The DAO token and the fee that feeds it
      </h3>
      <p>
        0.10% of every transfer of every launched token, and of the DAO token itself,{" "}
        <strong>buys DAO tokens and burns them</strong>. Each token&apos;s share is collected separately
        and swapped in batches through the best available route, and the program checks what it receives
        against a minimum it sets itself. Burning means the DAO token&apos;s reserves are shared between
        fewer tokens, so what each one can redeem goes up. Each redemption of a launched token before an
        end of life vote also sends 0.10% to the DAO token, in kind: any DAO tokens in it are burned,
        and the rest joins the DAO token&apos;s reserves.
      </p>
      <p>
        <strong>DAO tokens for a DAO pool are minted, not bought.</strong> When a token&apos;s DAO pool
        needs DAO tokens, at launch, for its share of the transfer fee that deepens the pools, or when
        Mint to Scale pairs into its pools, they are minted directly from the DAO token. The price is the
        highest of the DAO token&apos;s live price, its 24-hour average and its redemption value, so it
        is never below what one DAO token can redeem, there is no premium, and no transfer fee applies,
        because a mint is not a transfer. The USDC paid goes into the DAO token&apos;s reserves. This
        minting is not limited by the DAO token&apos;s own yearly Mint to Scale budget; the buy-and-burn
        offsets part of it.
      </p>
      <p>
        A creator can optionally run a third pool paired against the DAO token, at 10% to 20% of their
        liquidity, beside the SOL and stablecoin pools. The DAO tokens for it are minted as described
        above, and it is optional.
      </p>
      <p>
        The DAO token never holds itself. Its own basket can never include it, and it runs no DAO pool
        of its own.
      </p>
    </section>
  );
}
