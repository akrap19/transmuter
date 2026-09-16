import type { Metadata } from 'next'
import { DocsContent } from '@/app/docs/docs-content'
import { DocsMobileNav } from '@/app/docs/docs-mobile-nav'
import { DocsSidebar } from '@/app/docs/docs-sidebar'
import { SiteFooter, SiteNav } from '@/components/transmuter/site-chrome'
import { Wrap } from '@/components/transmuter/wrap'

export const metadata: Metadata = {
	title: 'Docs',
	description:
		'How Transmuter works: token types, collateral chain, launches, sales, fees, mint to scale, end of life, and governance.'
}

export default function DocsPage() {
	return (
		<div className='page-docs'>
			<SiteNav className='top' />
			<DocsMobileNav />
			<Wrap className='layout'>
				<DocsSidebar />
				<div className='docs-main'>
					<DocsContent />
				</div>
			</Wrap>
			<SiteFooter />
		</div>
	)
}
