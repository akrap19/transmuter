'use client'

import { Dialog } from 'radix-ui'
import { Copy, ExternalLink, X } from 'lucide-react'
import { DEVNET_USDC_MINT } from '@/lib/solana/config'
import { toastError, toastSuccess } from '@/lib/toast'

const SOL_FAUCET = 'https://faucet.solana.com/'
const USDC_FAUCET = 'https://faucet.circle.com/'

const WALLETS = [
	{
		name: 'Phantom',
		steps: [
			'Open Phantom and select your profile avatar in the upper left.',
			'Go to Settings, then Developer Settings.',
			'Turn on Testnet Mode.',
			'Choose Solana Devnet. A banner confirms test mode is on.'
		]
	},
	{
		name: 'Solflare',
		steps: [
			'Open Solflare and open Settings (the gear).',
			'Open Network. In some versions it sits under General.',
			'Choose Devnet.',
			'Confirm the warning. Devnet assets have no real value.'
		]
	}
] as const

export function DevnetGuideBody() {
	async function copyMint() {
		try {
			await navigator.clipboard.writeText(DEVNET_USDC_MINT)
			toastSuccess('USDC mint copied.')
		} catch {
			toastError('Could not copy the mint.')
		}
	}

	return (
		<>
			<div className='devnet-guide-bar'>
				<Dialog.Close className='devnet-guide-x' aria-label='Close'>
					<X size={16} />
				</Dialog.Close>
			</div>
			<div className='devnet-guide-scroll'>
				<p className='devnet-guide-kicker'>Devnet</p>
				<Dialog.Title className='devnet-guide-title'>Test on Devnet</Dialog.Title>
				<Dialog.Description className='devnet-guide-lede'>
					This site uses Solana Devnet. Switch the wallet first, then collect test SOL for fees and test USDC for
					buys. Devnet tokens have no value and cannot move to mainnet.
				</Dialog.Description>

				<section className='devnet-guide-section'>
					<h3>
						<span>01</span> Switch the wallet
					</h3>
					<div className='devnet-wallets'>
						{WALLETS.map(wallet => (
							<article className='devnet-card' key={wallet.name}>
								<strong>{wallet.name}</strong>
								<ol>
									{wallet.steps.map(step => (
										<li key={step}>{step}</li>
									))}
								</ol>
							</article>
						))}
					</div>
				</section>

				<section className='devnet-guide-section'>
					<h3>
						<span>02</span> Get Devnet SOL
					</h3>
					<p>A little SOL covers transaction fees. Your mainnet balance does not change.</p>
					<ol>
						<li>Open the Solana faucet and paste your wallet address.</li>
						<li>Request an airdrop. The public limit is about two requests every 8 hours.</li>
						<li>Signing in with GitHub raises that limit.</li>
					</ol>
					<a className='devnet-link' href={SOL_FAUCET} target='_blank' rel='noopener noreferrer'>
						Solana faucet <ExternalLink size={13} aria-hidden />
					</a>
				</section>

				<section className='devnet-guide-section'>
					<h3>
						<span>03</span> Get Devnet USDC
					</h3>
					<p>Buys and deposits use Circle&apos;s Devnet USDC. The faucet sends up to 20 USDC every 2 hours.</p>
					<ol>
						<li>Open the Circle faucet, choose Solana Devnet, and paste your wallet address.</li>
						<li>Request USDC. If it does not show up, add the mint below while the wallet is on Devnet.</li>
					</ol>
					<div className='devnet-mint'>
						<code>{DEVNET_USDC_MINT}</code>
						<button type='button' onClick={() => void copyMint()}>
							<Copy size={13} aria-hidden /> Copy
						</button>
					</div>
					<a className='devnet-link' href={USDC_FAUCET} target='_blank' rel='noopener noreferrer'>
						Circle faucet <ExternalLink size={13} aria-hidden />
					</a>
				</section>
			</div>

			<div className='devnet-guide-foot'>
				<Dialog.Close className='devnet-guide-done'>Got it</Dialog.Close>
			</div>
		</>
	)
}
