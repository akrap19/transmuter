import { describe, expect, it } from 'vitest'
import { explorerAddressUrl, resolveSolanaConfig } from '@/lib/solana/config'

const DEVNET_RPC = 'https://api.devnet.solana.com'

describe('resolveSolanaConfig', () => {
	it('defaults to public Solana devnet when env is unset', () => {
		const config = resolveSolanaConfig({})

		expect(config.networkName).toBe('devnet')
		expect(config.endpoint).toBe(DEVNET_RPC)
	})

	it('treats an unknown network name as devnet', () => {
		const config = resolveSolanaConfig({ NEXT_PUBLIC_SOLANA_NETWORK: 'localnet' })

		expect(config.networkName).toBe('devnet')
		expect(config.endpoint).toBe(DEVNET_RPC)
	})

	it('honors an explicit cluster and custom RPC', () => {
		const config = resolveSolanaConfig({
			NEXT_PUBLIC_SOLANA_NETWORK: 'mainnet-beta',
			NEXT_PUBLIC_SOLANA_RPC: 'https://example-rpc.invalid'
		})

		expect(config.networkName).toBe('mainnet-beta')
		expect(config.endpoint).toBe('https://example-rpc.invalid')
	})
})

describe('explorerAddressUrl', () => {
	it('points at the Solana explorer cluster for the given network', () => {
		expect(explorerAddressUrl('So11111111111111111111111111111111111111112', 'devnet')).toBe(
			'https://explorer.solana.com/address/So11111111111111111111111111111111111111112?cluster=devnet'
		)
	})
})
