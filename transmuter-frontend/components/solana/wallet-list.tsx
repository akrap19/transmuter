'use client'

import { WalletReadyState } from '@solana/wallet-adapter-base'
import type { Wallet } from '@solana/wallet-adapter-react'
import { ExternalLink } from 'lucide-react'

const SOLFLARE_URL = 'https://www.solflare.com/'

type WalletListProps = {
	wallets: Wallet[]
	onSelect: (wallet: Wallet) => void
}

export function WalletList({ wallets, onSelect }: WalletListProps) {
	const detected = wallets.filter(
		wallet => wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable
	)

	if (detected.length === 0) {
		return (
			<a className='wallet-install' href={SOLFLARE_URL} target='_blank' rel='noopener noreferrer' role='menuitem'>
				<SolflareMark />
				Solflare
				<ExternalLink size={14} aria-hidden className='wallet-install-go' />
			</a>
		)
	}

	return (
		<>
			{detected.map(wallet => (
				<button
					key={wallet.adapter.name}
					type='button'
					role='menuitem'
					className='wallet-option'
					onClick={() => onSelect(wallet)}
				>
					<img src={wallet.adapter.icon} alt='' className='wallet-user-icon' />
					{wallet.adapter.name}
				</button>
			))}
		</>
	)
}

function SolflareMark() {
	return (
		<svg className='wallet-user-icon' viewBox='0 0 290 290' aria-hidden>
			<path
				d='M63.3 1h163.4C261.1 1 289 28.9 289 63.3v163.4c0 34.4-27.9 62.3-62.3 62.3H63.3C28.9 289 1 261.1 1 226.7V63.3C1 28.9 28.9 1 63.3 1z'
				fill='#FFEF46'
				stroke='#EEDA0F'
				strokeWidth='2'
			/>
			<path
				d='M140.5 153.2l14.3-13.8 26.7 8.7c17.4 5.9 26.1 16.5 26.1 31.5 0 11.4-4.3 18.9-13.1 28.6l-2.6 2.9.9-6.8c3.9-24.7-3.3-35.3-27.3-43.1l-24.9-8zm-35.8-84.5 72.6 24.2-15.7 15.1-37.8-12.6c-13-4.4-17.4-11.4-19.1-26.2v-.5zm-4.3 123 16.4-15.7 31 10.2c16.2 5.3 21.8 12.3 20.1 30l-67.5-24.5zm-20.9-70.2c0-4.6 2.5-8.9 6.6-12.6 4.3 6.3 11.8 11.9 23.7 15.8l25.7 8.4-14.3 13.8-25.2-8.2c-11.6-3.9-16.5-9.7-16.5-17.2zm76.1 127.1c53.2-35.3 81.8-59.3 81.8-88.8 0-19.6-11.6-30.5-37.3-39l-19.4-6.5 53.1-50.9-10.7-11.4-15.7 13.8-74.4-24.4c-23 7.5-52 29.5-52 51.5 0 2.5.2 4.9 1 7.6-19.2 10.8-26.9 21-26.9 33.6 0 11.9 6.3 23.7 26.4 30.3l16 5.3-55.2 53 10.6 11.4 17.2-15.7 85.5 30.2z'
				fill='#02050A'
			/>
		</svg>
	)
}
