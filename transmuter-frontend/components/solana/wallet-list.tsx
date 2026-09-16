'use client'

import { WalletReadyState } from '@solana/wallet-adapter-base'
import type { Wallet } from '@solana/wallet-adapter-react'

type WalletListProps = {
	wallets: Wallet[]
	onSelect: (wallet: Wallet) => void
}

export function WalletList({ wallets, onSelect }: WalletListProps) {
	const detected = wallets.filter(
		wallet =>
			wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable
	)

	if (detected.length === 0) {
		return (
			<p className='wallet-empty'>
				No wallet found.{' '}
				<a href='https://phantom.app/' target='_blank' rel='noopener noreferrer'>
					Install Phantom
				</a>
			</p>
		)
	}

	return (
		<>
			{detected.map(wallet => (
				<button
					key={wallet.adapter.name}
					type='button'
					role='menuitem'
					onClick={() => onSelect(wallet)}
				>
					<img src={wallet.adapter.icon} alt='' className='wallet-user-icon' />
					{wallet.adapter.name}
				</button>
			))}
		</>
	)
}
