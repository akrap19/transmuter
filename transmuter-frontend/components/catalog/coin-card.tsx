import { CoinAvatar } from '@/components/catalog/coin-avatar'
import { CoinStatus } from '@/components/catalog/coin-status'
import { cardBackingLegs, formatBps, formatUnix, formatUsd } from '@/lib/catalog/format'
import { coinPathWithExplore } from '@/lib/catalog/search-params'
import type { CoinListItem, CoinQuery } from '@/lib/catalog/types'
import Link from 'next/link'

type CoinCardProps = {
	item: CoinListItem
	query: CoinQuery
}

function showSale(item: CoinListItem) {
	return item.status === 'sale' || (item.saleProgressBps != null && item.saleProgressBps > 0)
}

export function CoinCard({ item, query }: CoinCardProps) {
	const legs = cardBackingLegs(item.backingBasket, item.backing)

	return (
		<article className='explore-card'>
			<Link
				href={coinPathWithExplore(item.mint, query)}
				className='explore-card-link'
				aria-label={`${item.name} ($${item.symbol})`}>
				<header className='explore-card-head'>
					<CoinAvatar symbol={item.symbol} logoUrl={item.logoUrl} />
					<span className='explore-card-id'>
						<span className='explore-card-name'>{item.name}</span>
						<span className='explore-card-symbol'>${item.symbol}</span>
					</span>
					<CoinStatus status={item.status} />
				</header>
				<dl className='explore-card-metrics'>
					<div>
						<dt>Price</dt>
						<dd>{formatUsd(item.priceUsd)}</dd>
					</div>
					<div>
						<dt>Market cap</dt>
						<dd>{formatUsd(item.marketCapUsd)}</dd>
					</div>
					<div>
						<dt>Holders</dt>
						<dd>{item.holderCount}</dd>
					</div>
				</dl>
				<div className='explore-card-mix'>
					<p>Backing</p>
					<ol>
						{legs.map(leg => (
							<li key={leg.assetKind}>
								<span>{leg.label}</span>
								<strong>{leg.pct}%</strong>
								<i style={{ width: `${leg.pct}%` }} />
							</li>
						))}
					</ol>
				</div>
				{showSale(item) ? (
					<div className='explore-card-sale'>
						<span>Sale {formatBps(item.saleProgressBps)}</span>
						<span className='explore-card-bar' aria-hidden>
							<span style={{ width: `${Math.min((item.saleProgressBps ?? 0) / 100, 100)}%` }} />
						</span>
					</div>
				) : (
					<p className='explore-card-open'>
						Open launch{item.launchedAt ? ` · Launched ${formatUnix(item.launchedAt)}` : ''}
					</p>
				)}
			</Link>
		</article>
	)
}
