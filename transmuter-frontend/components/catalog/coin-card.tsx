import { CoinAvatar } from "@/components/catalog/coin-avatar";
import { CoinStatus } from "@/components/catalog/coin-status";
import { formatBps, formatUsd } from "@/lib/catalog/format";
import type { CoinListItem } from "@/lib/catalog/types";
import { coinPath } from "@/lib/routes";
import Link from "next/link";

type CoinCardProps = {
  item: CoinListItem;
};

function showSale(item: CoinListItem) {
  return item.status === "sale" || (item.saleProgressBps != null && item.saleProgressBps > 0);
}

export function CoinCard({ item }: CoinCardProps) {
  const backing =
    item.backingRatioBps == null ? item.backing : `${item.backing} · ${formatBps(item.backingRatioBps)}`;

  return (
    <article className="explore-card">
      <Link href={coinPath(item.mint)} className="explore-card-link" aria-label={`${item.name} ($${item.symbol})`}>
        <header className="explore-card-head">
          <CoinAvatar symbol={item.symbol} logoUrl={item.logoUrl} />
          <span className="explore-card-id">
            <span className="explore-card-name">{item.name}</span>
            <span className="explore-card-symbol">${item.symbol}</span>
          </span>
          <CoinStatus status={item.status} />
        </header>
        <dl className="explore-card-metrics">
          <div>
            <dt>Price</dt>
            <dd>{formatUsd(item.priceUsd)}</dd>
          </div>
          <div>
            <dt>Market cap</dt>
            <dd>{formatUsd(item.marketCapUsd)}</dd>
          </div>
          <div>
            <dt>Backing</dt>
            <dd>{backing}</dd>
          </div>
          <div>
            <dt>Holders</dt>
            <dd>{item.holderCount}</dd>
          </div>
        </dl>
        {showSale(item) ? (
          <div className="explore-card-sale">
            <span>Sale {formatBps(item.saleProgressBps)}</span>
            <span className="explore-card-bar" aria-hidden>
              <span style={{ width: `${Math.min((item.saleProgressBps ?? 0) / 100, 100)}%` }} />
            </span>
          </div>
        ) : (
          <p className="explore-card-open">Open launch</p>
        )}
      </Link>
    </article>
  );
}
