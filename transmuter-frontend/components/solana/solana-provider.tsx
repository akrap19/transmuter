'use client'

import { type ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { EMPTY_WALLETS, solanaEndpoint } from '@/lib/solana/config'

import '@solana/wallet-adapter-react-ui/styles.css'

type SolanaProviderProps = {
	children: ReactNode
}

export function SolanaProvider({ children }: SolanaProviderProps) {
	const endpoint = useMemo(() => solanaEndpoint, [])

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider wallets={EMPTY_WALLETS} autoConnect>
				<WalletModalProvider>{children}</WalletModalProvider>
			</WalletProvider>
		</ConnectionProvider>
	)
}
