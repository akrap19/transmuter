'use client'

import { useEffect, useRef, useState } from 'react'
import { useWallet, type Wallet } from '@solana/wallet-adapter-react'
import { ChevronDown, Wallet as WalletIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WalletList } from '@/components/solana/wallet-list'
import { WalletChip, WalletUserMenu } from '@/components/solana/wallet-user'
import { shortenAddress, solanaNetworkName } from '@/lib/solana/config'

type WalletButtonProps = {
	className?: string
	variant?: 'default' | 'nav'
}

export function WalletButton({ className, variant = 'default' }: WalletButtonProps) {
	const { publicKey, connected, connecting, wallet, wallets, select } = useWallet()
	const address = publicKey?.toBase58()
	const isConnected = connected && Boolean(address)
	const [menuOpen, setMenuOpen] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const nav = variant === 'nav'

	useEffect(() => {
		if (!menuOpen) return

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false)
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMenuOpen(false)
		}

		document.addEventListener('pointerdown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
		}
	}, [menuOpen])

	function handleSelect(next: Wallet) {
		setMenuOpen(false)
		void (async () => {
			try {
				select(next.adapter.name)
				await next.adapter.connect()
			} catch {
				return
			}
		})()
	}

	const label = connecting ? 'Connecting…' : isConnected && address ? shortenAddress(address) : 'Connect Wallet'

	return (
		<div className={cn('wallet-dropdown', menuOpen && 'is-open', className)} ref={rootRef}>
			<button
				type='button'
				className={nav ? 'nav-cta wallet-connect nav-wallet-trigger' : isConnected ? 'wallet-user-chip' : 'btn btn-gold wallet-connect'}
				aria-expanded={menuOpen}
				aria-haspopup='menu'
				aria-label={isConnected && address ? `Connected wallet ${shortenAddress(address)}` : 'Connect wallet'}
				disabled={connecting}
				onClick={() => setMenuOpen(open => !open)}
			>
				{nav ? <WalletIcon size={16} aria-hidden /> : null}
				{!nav && isConnected && address ? (
					<WalletChip
						address={address}
						walletName={wallet?.adapter.name}
						walletIcon={wallet?.adapter.icon}
					/>
				) : (
					<span>{label}</span>
				)}
				<ChevronDown size={14} aria-hidden className={cn('wallet-chevron', menuOpen && 'is-open')} />
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
