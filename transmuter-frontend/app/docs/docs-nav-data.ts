export type DocsNavLink = {
	label: string
	href: string
}

export type DocsNavGroup = {
	label: string
	links: DocsNavLink[]
}

export const docsNavGroups: DocsNavGroup[] = [
	{
		label: 'Protocol',
		links: [
			{ label: 'Overview', href: '#overview' },
			{ label: 'Token Types', href: '#tokens' },
			{ label: 'The Collateral Chain', href: '#chain' },
			{ label: 'Ratios & Verification', href: '#ratios' }
		]
	},
	{
		label: 'Launching',
		links: [
			{ label: 'Launching a Token', href: '#launch' },
			{ label: 'The Public Sale', href: '#sale' },
			{ label: 'Raise Protection', href: '#escrow' },
			{ label: 'Fees', href: '#fees' }
		]
	},
	{
		label: 'Lifecycle',
		links: [
			{ label: 'Mint to Scale', href: '#minttoscale' },
			{ label: 'End of Life', href: '#eol' }
		]
	},
	{
		label: 'Protocol',
		links: [
			{ label: 'Governance', href: '#governance' },
			{ label: 'Status', href: '#status' }
		]
	}
]
