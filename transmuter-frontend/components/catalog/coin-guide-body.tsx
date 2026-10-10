'use client'

import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'

const STAGES = [
	{
		name: 'Created',
		detail: 'The launch is registered. Treasury, sale, and trading are off.'
	},
	{
		name: 'Wired',
		detail: 'The treasury account exists. The sale is not open yet.'
	},
	{
		name: 'Sale',
		detail: 'Deposit USDC against the remaining cap. Withdraw that deposit in full until the window closes.'
	},
	{
		name: 'Active',
		detail: 'Finalize has run. Trading, staking, claims, and redemption turn on.'
	},
	{
		name: 'Liquidating',
		detail: 'End of life is underway. New stakes stop. Unstake and redemption stay open.'
	},
	{
		name: 'Voided',
		detail: 'The sale ended without going active. Trading, staking, and redemption stay off.'
	}
] as const

export function CoinGuideBody() {
	return (
		<>
			<div className='devnet-guide-bar'>
				<Dialog.Close className='devnet-guide-x' aria-label='Close'>
					<X size={16} />
				</Dialog.Close>
			</div>
			<div className='devnet-guide-scroll'>
				<p className='devnet-guide-kicker'>This coin</p>
				<Dialog.Title className='devnet-guide-title'>How this coin works</Dialog.Title>
				<Dialog.Description className='devnet-guide-lede'>
					The status next to the name is the stage. A section appears on this page only after that stage has
					turned it on.
				</Dialog.Description>

				<section className='devnet-guide-section'>
					<h3>
						<span>01</span> The stages
					</h3>
					<div className='devnet-wallets'>
						{STAGES.map(stage => (
							<article className='devnet-card' key={stage.name}>
								<strong>{stage.name}</strong>
								<p>{stage.detail}</p>
							</article>
						))}
					</div>
				</section>

				<section className='devnet-guide-section'>
					<h3>
						<span>02</span> During the sale
					</h3>
					<ol>
						<li>Deposits are open while the window is running and the allocation is not sold out.</li>
						<li>Withdrawals stay open until the close time, even after deposits shut.</li>
						<li>The cap is the sale allocation, not a bonding curve.</li>
						<li>Finalize opens when the window ends or the allocation sells out. Any wallet can crank it.</li>
					</ol>
				</section>

				<section className='devnet-guide-section'>
					<h3>
						<span>03</span> Right after finalize
					</h3>
					<ol>
						<li>Convert the remaining USDC into the backing cToken.</li>
						<li>Seed the Raydium pool when the LP vault still holds inventory.</li>
						<li>Buyers claim the tokens they purchased.</li>
						<li>Trade opens on the EOL/USDC and EOL/SOL pools.</li>
					</ol>
				</section>

				<section className='devnet-guide-section'>
					<h3>
						<span>04</span> While the token is live
					</h3>
					<ol>
						<li>Stake and unstake are free. Voting weight freezes when a vote opens.</li>
						<li>End of life is a holder vote. Opening it needs the trouble gate. Executing it waits until the vote window closes. Both are permissionless.</li>
						<li>Redeem by burning tokens. It pays a pro-rata share of backing and never closes. One stuck payout does not block the other.</li>
						<li>Vesting pays from the recipient&apos;s own pot. Unvested team tokens burn at end of life.</li>
						<li>Runway escrow lets the team draw vested USDC on the schedule. Halt, resume, and advance are votes. They change the schedule and do not move the money.</li>
					</ol>
				</section>
			</div>
			<div className='devnet-guide-foot'>
				<Dialog.Close className='devnet-guide-done'>Got it</Dialog.Close>
			</div>
		</>
	)
}
