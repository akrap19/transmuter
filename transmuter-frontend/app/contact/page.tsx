import type { Metadata } from 'next'
import { GoldButton } from '@/components/transmuter/gold-button'
import { HeroCorners, SectionLabel } from '@/components/transmuter/hero-elements'
import { SiteFooter, SiteNav } from '@/components/transmuter/site-chrome'
import { Wrap } from '@/components/transmuter/wrap'
import { externalLinks, teamEmail } from '@/lib/routes'

export const metadata: Metadata = {
	title: 'Contact',
	description:
		'Collaborators, partners, investors, and future team members building end of life infrastructure with Transmuter.'
}

const roles = [
	{
		title: 'COLLABORATORS',
		body: 'Builders, auditors, researchers, designers. If you can make the protocol better, sharper, or safer, we want to hear from you.'
	},
	{
		title: 'PARTNERS',
		body: 'Wallets, DAOs, ecosystems, tokenized gold issuers, audit firms. Integrations that put EOL infrastructure into more hands.'
	},
	{
		title: 'INVESTORS',
		body: "We're raising our pre-seed round. Ask for the deck, the architecture, and the numbers behind both."
	},
	{
		title: 'TEAM',
		body: 'A small but dedicated team on an important mission. If you see yourself in it, feel free to introduce yourself.'
	}
]

export default function ContactPage() {
	return (
		<div className='page-contact'>
			<SiteNav />

			<header>
				<Wrap className='hero-framed'>
					<HeroCorners />
					<div className='eyebrow'>Contact</div>
					<h1>BUILD IT WITH US</h1>
					<p className='hero-line'>
						We&apos;re looking for <b>collaborators, partners, investors and future team members</b> who are passionate
						about what we&apos;re building and want to play a part in it. If this is something you want to be part of
						and can contribute to, don&apos;t hesitate to reach out.
					</p>
				</Wrap>
			</header>

			<section>
				<Wrap>
					<SectionLabel>Who We&apos;re Looking For</SectionLabel>
					<h2>Pick your door, they&apos;re all open.</h2>
					<div className='roles'>
						{roles.map(role => (
							<div key={role.title} className='rcard'>
								<h3>{role.title}</h3>
								<p>{role.body}</p>
							</div>
						))}
					</div>
				</Wrap>
			</section>

			<div className='channels'>
				<Wrap>
					<div className='chan'>
						<div className='k'>Email</div>
						<a className='big' href={externalLinks.email}>
							{teamEmail}
						</a>
						<p>Tell us who you are and which door you&apos;re knocking on. We read everything.</p>
					</div>
					<div className='chan'>
						<div className='k'>X / Twitter</div>
						<a className='big' href={externalLinks.twitter} target='_blank' rel='noopener'>
							@TransmuterTMI
						</a>
						<p>Follow the build, or just DM us there.</p>
					</div>
				</Wrap>
			</div>

			<section className='closing'>
				<Wrap>
					<SectionLabel>How We Choose</SectionLabel>
					<h2>Infrastructure that benefits every participant.</h2>
					<p>
						Every partnership we enter is evaluated on one question: does this make the protocol{' '}
						<b>more useful, more accessible, or more secure for holders</b>? If the answer is yes, let&apos;s talk.
					</p>
					<GoldButton href={externalLinks.email}>Get in touch</GoldButton>
				</Wrap>
			</section>

			<SiteFooter />
		</div>
	)
}
