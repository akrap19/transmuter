'use client'

import { computeOverflowFromState } from '@/lib/launchpad/overflow-calc'
import { formatMcap, formatNum, formatPrice } from '@/lib/launchpad/launch-solver'
import { TRANSFER_FEE_RANGE, formatTransferFee } from '@/lib/launchpad/fee-calculator'
import { activeLegs, assetMeta } from '@/lib/launchpad/backing-basket'
import { useLaunchpad } from './launchpad-context'

const SALE_LABELS = {
	fixed: 'Fixed price',
	dutch: 'Reverse Dutch',
	overflow: 'Overflow pool'
} as const

export function PreviewSidebar() {
	const { state, launchSolve: L } = useLaunchpad()
	const name = state.tokenName || 'Your Token'
	const ticker = state.tokenTicker || 'TICKER'
	const supply = parseFloat(state.tokenSupply)
	const backingLegs = activeLegs(state.backingBasket)
	const overflow = state.saleType === 'overflow' ? computeOverflowFromState(state) : null

	let price = L?.feasible ? L.price : undefined
	let mcap = price && supply ? price * supply : null

	if (state.saleType === 'overflow' && overflow?.listPrice && overflow.listPrice !== '—') {
		const numericPrice = parseFloat(overflow.listPrice.replace(/^\$/, ''))
		if (!isNaN(numericPrice)) {
			price = numericPrice
			mcap = supply && !isNaN(supply) ? numericPrice * supply : null
		}
	}

	return (
		<div className='sidebar'>
			<div className='preview-panel'>
				<div className='preview-title'>Live preview</div>
				<div className='preview-token-header'>
					<div className='preview-token-icon'>
						{state.logoUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img className='preview-token-preview' src={state.logoUrl} alt='' />
						) : (
							ticker.slice(0, 2) || 'TK'
						)}
					</div>
					<div>
						<div className='preview-token-name'>{name}</div>
						<div className='preview-token-ticker'>${ticker} • EOL</div>
					</div>
				</div>

				<PreviewStat label='Initial Price' value={price ? `$${formatPrice(price)}` : '-'} cyan />
				<PreviewStat label='Sale Type' value={SALE_LABELS[state.saleType]} gold />
				<PreviewStat label='Total Supply' value={supply && !isNaN(supply) ? formatNum(supply) : '-'} />
				<PreviewStat
					label='Implied market cap'
					value={state.saleType === 'overflow' && overflow?.mcp ? overflow.mcp : mcap ? `$${formatMcap(mcap)}` : '-'}
					gold
				/>
				<PreviewStat
					label='Transfer fee'
					value={formatTransferFee(state.fees.totalFee)}
					hint={`Range ${TRANSFER_FEE_RANGE}`}
				/>
				<div className='preview-stat'>
					<span className='preview-stat-label'>Reserve asset</span>
					<span className='preview-stat-value green preview-backing-value'>
						{backingLegs.length ? (
							backingLegs.map((leg) => (
								<span key={leg.asset} className='preview-backing-part'>
									{assetMeta(leg.asset).symbol} {leg.weight}%
								</span>
							))
						) : (
							'—'
						)}
					</span>
				</div>
			</div>

			<div className='panel benefits-panel'>
				<div className='panel-title benefits-title'>EOL token benefits</div>
				<div className='benefits-list'>
					✓ Non-custodial treasury
					<br />
					✓ Treasury closed to the creator. Runway paid through escrow.
					<br />
					✓ Treasury grows with every transfer.
					<br />
					✓ Holders can redeem their share at any time.
					<br />
					✓ Built-in end of life plan
					<br />
					✓ Holders vote on the fee, the budget, escrow and end of life.
					<br />✓ Pools nobody can pull or drain.
				</div>
			</div>
		</div>
	)
}

function PreviewStat({
	label,
	value,
	hint,
	cyan,
	gold,
	green
}: {
	label: string
	value: string
	hint?: string
	cyan?: boolean
	gold?: boolean
	green?: boolean
}) {
	const cls = cyan ? 'cyan' : gold ? 'gold' : green ? 'green' : ''
	return (
		<div className='preview-stat'>
			<span className='preview-stat-label'>{label}</span>
			<span className='preview-stat-stack'>
				<span className={`preview-stat-value${cls ? ` ${cls}` : ''}`}>{value}</span>
				{hint ? <span className='preview-stat-hint'>{hint}</span> : null}
			</span>
		</div>
	)
}
