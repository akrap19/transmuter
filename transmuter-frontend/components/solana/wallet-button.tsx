'use client'

import { useWallet, type Wallet } from '@solana/wallet-adapter-react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WalletList } from '@/components/solana/wallet-list'
import { WalletChip, WalletUserMenu } from '@/components/solana/wallet-user'
import { shortenAddress } from '@/lib/solana/config'

type WalletButtonProps = {
	className?: string
}

export function WalletButton({ className }: WalletButtonProps) {
	const { publicKey, connected, connecting, wallet, wallets, select } = useWallet()
	const address = publicKey?.toBase58()
	const isConnected = connected && Boolean(address)

	function handleSelect(next: Wallet) {
		void (async () => {
			try {
				select(next.adapter.name)
				await next.adapter.connect()
			} catch {
				return
			}
		})()
	}

	return (
		<div className={cn('wallet-dropdown', className)}>
			<button
				type='button'
				className={isConnected ? 'wallet-user-chip' : 'btn btn-gold wallet-connect'}
				aria-haspopup='menu'
				aria-label={isConnected && address ? `Connected wallet ${shortenAddress(address)}` : 'Connect wallet'}
				disabled={connecting}
			>
				{isConnected && address ? (
					<WalletChip
						address={address}
						walletName={wallet?.adapter.name}
						walletIcon={wallet?.adapter.icon}
					/>
				) : (
					<span>{connecting ? 'Connecting…' : 'Connect Wallet'}</span>
				)}
				<ChevronDown size={14} className='wallet-chevron' />
			</button>
			<div className='wallet-user-menu' role='menu'>
				<div className='wallet-menu-label'>{isConnected ? 'Account' : 'Select wallet'}</div>
				{isConnected && address ? (
					<WalletUserMenu address={address} />
				) : (
					<WalletList wallets={wallets} onSelect={handleSelect} />
				)}
			</div>
		</div>
	)
}
