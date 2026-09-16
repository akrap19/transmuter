import { type Adapter, WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'

const networkByName = {
	'mainnet-beta': WalletAdapterNetwork.Mainnet,
	testnet: WalletAdapterNetwork.Testnet,
	devnet: WalletAdapterNetwork.Devnet
} as const

type NetworkName = keyof typeof networkByName

function parseNetwork(value: string | undefined): NetworkName {
	if (value === 'mainnet-beta' || value === 'devnet' || value === 'testnet') return value
	return 'testnet'
}

export const solanaNetworkName = parseNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK)
export const solanaNetwork = networkByName[solanaNetworkName]
export const solanaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl(solanaNetwork)
export const EMPTY_WALLETS: Adapter[] = []

export function shortenAddress(address: string, chars = 4) {
	return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

export function explorerAddressUrl(address: string) {
	const cluster = solanaNetworkName === 'mainnet-beta' ? '' : `?cluster=${solanaNetworkName}`
	return `https://explorer.solana.com/address/${address}${cluster}`
}
