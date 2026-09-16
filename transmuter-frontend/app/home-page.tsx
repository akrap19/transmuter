import { GoldButton } from '@/components/transmuter/gold-button'
import { HeroCorners, PerspectiveFloor, Pill, SectionLabel } from '@/components/transmuter/hero-elements'
import { SiteFooter, SiteNav } from '@/components/transmuter/site-chrome'
import { Wrap } from '@/components/transmuter/wrap'
import { CollateralChain } from '@/components/transmuter/collateral-chain'
import { StatsSection } from '@/components/transmuter/stats-section'
import { TransmuteStrip } from '@/components/transmuter/transmute-strip'
import { routes } from '@/lib/routes'

const launchSteps = [
	{
		n: 'Step 1',
		title: 'Launch with a reserve',
		body: "The public sale ensures EOL reserves from day 1. If it can't fund the minimum reserve, the launch voids and every deposit walks away whole."
	},
	{
		n: 'Step 2',
		title: 'Trade, the backing grows',
		body: 'Every transaction feeds the reserve and burns supply down the chain. Holding gets more backed over time, automatically.'
	},
	{
		n: 'Step 3',
		title: 'End of life, not end of value',
		body: 'If a project dies, holders vote, the protocol liquidates, and everyone redeems their share of the EOL reserves. You never lose everything.'
	}
]

export function HomePage() {
	return (
		<div className='page-home'>
			<SiteNav />

			<header>
				<PerspectiveFloor />
				<Wrap className='hero-framed'>
					<HeroCorners />
					<h1 className='hero-brand'>TRANSMUTER</h1>
					<Pill>Launchpad &amp; End of Life Infrastructure</Pill>
					<p className='hero-line'>
						Every token has an end of life.
						<br />
						We built the infrastructure for it.
					</p>
					<p className='hero-sub'>
						Tokens launched here carry a funded reserve from day one that ends in gold. When a project dies, holders
						redeem against the EOL reserves.
					</p>
					<div className='hero-cta'>
						<GoldButton href={routes.access}>Get early access</GoldButton>
						<GoldButton href='#protocol' variant='ghost'>
							How it works
						</GoldButton>
					</div>
				</Wrap>
				<TransmuteStrip />
			</header>

			<section id='protocol'>
				<Wrap>
					<SectionLabel>Collateral Chain</SectionLabel>
					<h2>Multiple layers of safety nets and contingencies</h2>
					<p className='sec-intro'>
						Three layers, each backed by the one after it. We custody nothing: reserves live in contracts, grow
						automatically from protocol fees, and are governed by a DAO. The tokenized gold at the end of the chain is
						vaulted by its regulated issuer, never by us.
					</p>
					<CollateralChain />
					<div className='chain-note'>
						Project fails › holders exit into cTokens. &nbsp;If the cToken&apos;s base asset ever fails › holders exit
						into <b>gold</b>.
					</div>
				</Wrap>
			</section>

			<StatsSection />

			<section id='launch'>
				<Wrap>
					<SectionLabel>How a Launch Works</SectionLabel>
					<h2>A safer way to launch and trade tokens</h2>
					<p className='sec-intro'>
						Launching is free. A public sale, fixed price, Dutch auction, or overflow pool, funds the reserve before a
						single token trades, and deposits stay withdrawable until the sale concludes.
					</p>
					<div className='steps'>
						{launchSteps.map(step => (
							<div key={step.n} className='step'>
								<div className='n'>{step.n}</div>
								<h3>{step.title}</h3>
								<p>{step.body}</p>
							</div>
						))}
					</div>
				</Wrap>
			</section>

			<section className='cta' id='access'>
				<PerspectiveFloor />
				<Wrap>
					<SectionLabel>Chain Agnostic Infrastructure</SectionLabel>
					<h2>Every token ends. Yours can end cleanly.</h2>
					<p>Testnet is coming. Be there when the first token launches with real reserves behind it.</p>
					<GoldButton href={routes.access}>Get early access</GoldButton>
				</Wrap>
			</section>

			<SiteFooter />
		</div>
	)
}
