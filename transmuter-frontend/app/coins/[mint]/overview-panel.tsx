import { CoinSocials } from "@/app/coins/[mint]/coin-socials";
import { CoinIdentity } from "@/components/catalog/coin-identity";
import { CoinStatus } from "@/components/catalog/coin-status";
import { formatBps, formatUsd } from "@/lib/catalog/format";
import { explorerAddressUrl } from "@/lib/solana/config";
import type { CoinDetail } from "@/lib/catalog/types";

export function OverviewPanel({ coin }: { coin: CoinDetail }) {
  return (
    <section className="catalog-section">
      <header className="catalog-header catalog-coin-head">
        <p className="page-eyebrow">TRANSMUTER · TOKEN</p>
        <CoinIdentity mint={coin.mint} name={coin.name} symbol={coin.symbol} logoUrl={coin.logoUrl} />
        <p className="page-subtitle">{coin.description || `${coin.name} on Transmuter — Factory-registered EOL launch.`}</p>
        <CoinSocials socials={coin.socials} />
      </header>
      <div className="catalog-stats">
        <article>
          <span>Price</span>
          <strong>{formatUsd(coin.priceUsd)}</strong>
        </article>
        <article>
          <span>Market cap</span>
          <strong>{formatUsd(coin.marketCapUsd)}</strong>
        </article>
        <article>
          <span>Backing ratio</span>
          <strong>{formatBps(coin.backingRatioBps)}</strong>
        </article>
        <article>
          <span>Sale progress</span>
          <strong>{formatBps(coin.saleProgressBps)}</strong>
        </article>
      </div>
      <dl className="catalog-coin-meta">
        <div>
          <dt>Status</dt>
          <dd>
            <CoinStatus status={coin.status} />
          </dd>
        </div>
        <div>
          <dt>Treasury (incl. USDC)</dt>
          <dd>{formatUsd(coin.treasury.backingValueUsd)}</dd>
        </div>
        <div>
          <dt>Unconverted USDC</dt>
          <dd>{formatUsd(coin.treasury.unconvertedUsdc)}</dd>
        </div>
        <div>
          <dt>Holders</dt>
          <dd>{coin.holderCount}</dd>
        </div>
        <div>
          <dt>Mint</dt>
          <dd>
            <a href={explorerAddressUrl(coin.mint)} target="_blank" rel="noopener noreferrer">
              Explorer
            </a>
          </dd>
        </div>
        <div>
          <dt>Backing</dt>
          <dd>{coin.backing}</dd>
        </div>
      </dl>
    </section>
  );
}
