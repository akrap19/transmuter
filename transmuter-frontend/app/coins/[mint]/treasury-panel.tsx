import { formatAmount, formatUsd } from "@/lib/catalog/format";
import type { CoinDetail } from "@/lib/catalog/types";

export function TreasuryPanel({ coin }: { coin: CoinDetail }) {
  const { treasury } = coin;
  const { reserveMint } = treasury;

  return (
    <section className="catalog-section">
      <h2>Treasury transparency</h2>
      <p>
        Every backing read counts unconverted USDC. Redemption is quantity-based ({coin.backing} / circulating), not an
        oracle price.
      </p>
      <div className="catalog-stats">
        <article>
          <span>{coin.backing} treasury</span>
          <strong>{formatAmount(treasury.cTokenAmount)}</strong>
        </article>
        <article>
          <span>Unconverted USDC</span>
          <strong>{formatUsd(treasury.unconvertedUsdc)}</strong>
        </article>
        <article>
          <span>Backing value</span>
          <strong>{formatUsd(treasury.backingValueUsd)}</strong>
        </article>
        <article>
          <span>Redemption</span>
          <strong>{formatAmount(treasury.redemptionRatio)}</strong>
        </article>
      </div>
      <dl className="catalog-coin-meta">
        <div>
          <dt>Path A</dt>
          <dd>{reserveMint.pathAReady ? "Ready" : "Idle"}</dd>
        </div>
        <div>
          <dt>Path B</dt>
          <dd>{reserveMint.pathBActivated ? "Activated" : "Not activated"}</dd>
        </div>
        <div>
          <dt>Governed mint</dt>
          <dd>{reserveMint.governedPct}% of supply</dd>
        </div>
        <div>
          <dt>Reserve mints this year</dt>
          <dd>
            {reserveMint.mintsThisYear} / {reserveMint.yearlyCap}
          </dd>
        </div>
        <div>
          <dt>Circulating</dt>
          <dd>{formatAmount(treasury.circulatingSupply)}</dd>
        </div>
        <div>
          <dt>cToken mark</dt>
          <dd>{formatUsd(treasury.cTokenPriceUsd)}</dd>
        </div>
      </dl>
    </section>
  );
}
