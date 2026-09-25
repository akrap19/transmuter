import { type Adapter, WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'

const networkByName = {
	'mainnet-beta': WalletAdapterNetwork.Mainnet,
	testnet: WalletAdapterNetwork.Testnet,
	devnet: WalletAdapterNetwork.Devnet
} as const

type NetworkName = keyof typeof networkByName

export const DEVNET_RPC = 'https://api.devnet.solana.com'

/** Circle devnet USDC. Factory on devnet was initialized with this mint. */
export const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

type SolanaEnv = Record<string, string | undefined>

function readProcessEnv(): SolanaEnv {
	return {
		NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
		NEXT_PUBLIC_SOLANA_RPC: process.env.NEXT_PUBLIC_SOLANA_RPC,
		NEXT_PUBLIC_USDC_MINT: process.env.NEXT_PUBLIC_USDC_MINT
	}
}

function parseNetwork(value: string | undefined): NetworkName {
	if (value === 'mainnet-beta' || value === 'devnet' || value === 'testnet') return value
	return 'devnet'
}

export function resolveUsdcMint(env: SolanaEnv = readProcessEnv()): string {
	const mint = env.NEXT_PUBLIC_USDC_MINT?.trim()
	return mint || DEVNET_USDC_MINT
}

export function resolveSolanaConfig(env: SolanaEnv = readProcessEnv()) {
	const networkName = parseNetwork(env.NEXT_PUBLIC_SOLANA_NETWORK)
	const network = networkByName[networkName]
	const endpoint = env.NEXT_PUBLIC_SOLANA_RPC ?? (networkName === 'devnet' ? DEVNET_RPC : clusterApiUrl(network))

	return { networkName, network, endpoint, usdcMint: resolveUsdcMint(env) }
}

const resolved = resolveSolanaConfig()

export const solanaNetworkName = resolved.networkName
export const solanaNetwork = resolved.network
export const solanaEndpoint = resolved.endpoint
export const usdcMint = resolved.usdcMint
export const EMPTY_WALLETS: Adapter[] = []

export function shortenAddress(address: string, chars = 4) {
	return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

export function explorerAddressUrl(address: string, networkName: NetworkName = solanaNetworkName) {
	const cluster = networkName === 'mainnet-beta' ? '' : `?cluster=${networkName}`
	return `https://explorer.solana.com/address/${address}${cluster}`
}
