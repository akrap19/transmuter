import type { Metadata } from 'next'
import { LaunchpadNav, SiteFooter } from '@/components/transmuter/site-chrome'
import { LaunchpadWizard } from './launchpad-wizard'

export const metadata: Metadata = {
	title: 'Launchpad',
	description:
		'Create your reinforced token on Transmuter. Treasury-backed, non-custodial, with built-in end of life protection.'
}

export default function LaunchpadPage() {
	return (
		<div className='launchpad-page'>
			<LaunchpadNav />

			<div className='page-wrapper'>
				<LaunchpadWizard />
			</div>

			<SiteFooter />
		</div>
	)
}
