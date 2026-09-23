'use client'

import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { Coins, Copy, ExternalLink, LayoutDashboard, LogOut } from 'lucide-react'
import { explorerAddressUrl, shortenAddress, solanaNetworkName } from '@/lib/solana/config'
import { routes } from '@/lib/routes'

type WalletChipProps = {
	address: string
	walletName?: string
	walletIcon?: string
}

export function WalletChip({ address, walletName, walletIcon }: WalletChipProps) {
	return (
		<>
			{walletIcon ? (
				<img src={walletIcon} alt='' className='wallet-user-icon' />
			) : (
				<span className='wallet-user-ident' aria-hidden />
			)}
			<span className='wallet-user-meta'>
				<span className='wallet-user-name'>{walletName ?? 'Wallet'}</span>
				<span className='wallet-user-address'>{shortenAddress(address)}</span>
			</span>
		</>
	)
}

type WalletUserMenuProps = {
	address: string
}

export function WalletUserMenu({ address }: WalletUserMenuProps) {
	const { disconnect } = useWallet()

	return (
		<>
			<Link href={routes.myCoins} role='menuitem'>
				<Coins size={14} /> My Coins
			</Link>
			<Link href={routes.portfolio} role='menuitem'>
				<LayoutDashboard size={14} /> Portfolio
			</Link>
			<button type='button' role='menuitem' onClick={() => navigator.clipboard.writeText(address)}>
				<Copy size={14} /> Copy address
			</button>
			<a href={explorerAddressUrl(address)} target='_blank' rel='noopener noreferrer' role='menuitem'>
				<ExternalLink size={14} /> View on explorer
			</a>
			<button type='button' role='menuitem' onClick={() => void disconnect()}>
				<LogOut size={14} /> Disconnect
			</button>
		</>
	)
}
