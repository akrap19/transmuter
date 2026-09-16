export function OverviewSection() {
	return (
		<section id='overview' style={{ padding: '0 0' }}>
			<h2>Overview</h2>
			<p>
				Most tokens die, and when they do their holders are left with nothing. There is no reserve to fall back on, no
				orderly wind-down, no floor under the collapse. Transmuter treats that ending as part of the design instead of
				ignoring it.
			</p>
			<p>
				Transmuter is a launchpad with <b>end of life infrastructure</b>. Every token launched here carries a funded,
				non-custodial reserve from day one, and a contract defined path for what happens when the project ends: holders
				vote, the protocol liquidates, and everyone redeems their share of the EOL reserves.
			</p>
			<p>
				The architecture is <b>chain agnostic</b>. The first deployment targets Solana; the design assumes nothing that
				ties it to one chain.
			</p>
		</section>
	)
}
