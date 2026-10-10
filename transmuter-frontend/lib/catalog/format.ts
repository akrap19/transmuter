export function formatUsd(value: number | null): string {
	if (value == null) return '—'
	const abs = Math.abs(value)
	const maximumFractionDigits = abs > 0 && abs < 0.005 ? 8 : 2
	const formatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits
	}).format(value)
	if (value !== 0 && (formatted === '$0.00' || formatted === '-$0.00')) {
		const body = `$${formatTiny(abs)}`
		return value < 0 ? `-${body}` : body
	}
	return formatted
}

export function formatBps(bps: number | null): string {
	if (bps == null) return '—'
	const pct = bps / 100
	return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(2)}%`
}

/** Short label for an on-chain backing-asset kind (matches `BACKING_ASSET_*`). */
const BACKING_ASSET_LABELS: Record<number, string> = {
	0: 'SOL',
	1: 'BTC',
	2: 'Gold',
	3: 'S&P'
}

export type BasketPart = { assetKind: number; label: string; pct: string }

const CARD_BACKING_ASSETS = [
	{ assetKind: 0, label: 'SOL', names: ['csol', 'sol'] },
	{ assetKind: 1, label: 'BTC', names: ['cbtc', 'btc'] },
	{ assetKind: 2, label: 'Gold', names: ['cgold', 'gold', 'xau'] },
	{ assetKind: 3, label: 'S&P', names: ['cspx', 'spx', 's&p'] }
] as const

function pctLabel(weightBps: number): string {
	const pct = weightBps / 100
	return Number.isInteger(pct) ? String(pct) : pct.toFixed(2)
}

/** All four reserve assets, in canonical order. A single-asset launch is 100% on that asset. */
export function cardBackingLegs(
	basket: ReadonlyArray<{ assetKind: number; weightBps: number }> | null | undefined,
	backing: string
): BasketPart[] {
	const weights = new Map<number, number>()
	const stored = basket?.some(leg => leg.weightBps > 0) ? basket : null
	if (stored) {
		for (const leg of stored) weights.set(leg.assetKind, leg.weightBps)
	} else {
		const name = backing.trim().toLowerCase()
		const match = CARD_BACKING_ASSETS.find(asset => asset.names.some(label => label === name))
		if (match) weights.set(match.assetKind, 10_000)
	}
	return CARD_BACKING_ASSETS.map(asset => ({
		assetKind: asset.assetKind,
		label: asset.label,
		pct: pctLabel(weights.get(asset.assetKind) ?? 0)
	}))
}

/** Render a backing basket as "SOL 60% · Gold 40%", skipping zero-weight legs. */
export function formatBackingBasket(
	basket: ReadonlyArray<{ assetKind: number; weightBps: number }> | null | undefined,
	fallback: string
): string {
	if (!basket || basket.length === 0) return fallback
	const legs = basket
		.filter(leg => leg.weightBps > 0)
		.map(leg => `${BACKING_ASSET_LABELS[leg.assetKind] ?? `#${leg.assetKind}`} ${leg.weightBps / 100}%`)
	return legs.length > 0 ? legs.join(' · ') : fallback
}

const STATUS_LABELS: Record<string, string> = {
	liquidating: 'END OF LIFE'
}

export function formatStatus(status: string): string {
	return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toUpperCase()
}

export function formatAmount(value: number): string {
	if (!Number.isFinite(value)) return '—'
	const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
	if (value !== 0 && (formatted === '0' || formatted === '-0')) {
		const body = formatTiny(Math.abs(value))
		return value < 0 ? `-${body}` : body
	}
	return formatted
}

/** Positive dust that fixed decimals would draw as zero, written out in full. */
function formatTiny(abs: number, significant = 4): string {
	const precise = Number(abs.toPrecision(significant))
	const [coefficient, exponentRaw] = precise.toExponential(significant - 1).split('e')
	const exponent = Number(exponentRaw)
	if (exponent >= 0) {
		return new Intl.NumberFormat('en-US', { maximumSignificantDigits: significant }).format(precise)
	}
	const zeros = -exponent - 1
	const digits = coefficient.replace('.', '').replace(/0+$/, '')
	return `0.${'0'.repeat(zeros)}${digits}`
}

export function formatUnix(seconds: number): string {
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(seconds * 1000))
}

export function formatRemaining(closesAt: number, now: number): string {
	const left = Math.floor(closesAt - now)
	if (left <= 0) return 'Closed'
	const days = Math.floor(left / 86_400)
	const hours = Math.floor((left % 86_400) / 3_600)
	const minutes = Math.floor((left % 3_600) / 60)
	const seconds = left % 60
	if (days > 0) return `${days}d ${hours}h`
	if (hours > 0) return `${hours}h ${minutes}m`
	return `${minutes}m ${seconds}s`
}
