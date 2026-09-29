import { PublicKey } from '@solana/web3.js'
import { describe, expect, it, vi } from 'vitest'
import { readEolConfig, readEolDeposit, readFactoryLaunch, readFactoryLaunchByMint, readOwnerTokenBalances } from '@/lib/solana/accounts'
import { eolConfigPda, eolDepositPda } from '@/lib/solana/programs/eol-token'
import { factoryMintIndexPda, launchPda } from '@/lib/solana/programs/factory'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@/lib/solana/spl-token'

const mint = new PublicKey('So11111111111111111111111111111111111111112')
const owner = new PublicKey('11111111111111111111111111111111')

function fetcher<T>(account: T | null) {
	return { fetchNullable: vi.fn().mockResolvedValue(account) }
}

describe('readFactoryLaunch', () => {
	it('loads the Factory launch account at the launch PDA', async () => {
		const launch = fetcher({ name: 'Devnet', status: 2 })

		const read = await readFactoryLaunch(launch, 7)

		expect(launch.fetchNullable).toHaveBeenCalledWith(launchPda(7))
		expect(read?.address.equals(launchPda(7))).toBe(true)
		expect(read?.account).toEqual({ name: 'Devnet', status: 2 })
	})

	it('returns null when the launch account is missing', async () => {
		const launch = fetcher(null)

		await expect(readFactoryLaunch(launch, 7)).resolves.toBeNull()
	})
})

describe('readFactoryLaunchByMint', () => {
	it('resolves the mint index, then the launch', async () => {
		const accounts = {
			mintIndex: fetcher({ launchId: { toString: () => '4' } }),
			launch: fetcher({ symbol: 'DNET' })
		}

		const read = await readFactoryLaunchByMint(accounts, mint)

		expect(accounts.mintIndex.fetchNullable).toHaveBeenCalledWith(factoryMintIndexPda(mint))
		expect(accounts.launch.fetchNullable).toHaveBeenCalledWith(launchPda(4))
		expect(read?.launchId).toBe(BigInt(4))
		expect(read?.account).toEqual({ symbol: 'DNET' })
	})

	it('does not fetch a launch when the mint is not indexed', async () => {
		const accounts = { mintIndex: fetcher(null), launch: fetcher({ symbol: 'DNET' }) }

		await expect(readFactoryLaunchByMint(accounts, mint)).resolves.toBeNull()
		expect(accounts.launch.fetchNullable).not.toHaveBeenCalled()
	})
})

describe('readEolConfig', () => {
	it('loads the EOL config at the config PDA', async () => {
		const config = fetcher({ raisedUsdc: BigInt(10) })

		const read = await readEolConfig(config, mint)

		expect(config.fetchNullable).toHaveBeenCalledWith(eolConfigPda(mint))
		expect(read?.address.equals(eolConfigPda(mint))).toBe(true)
		expect(read?.account).toEqual({ raisedUsdc: BigInt(10) })
	})
})

describe('readEolDeposit', () => {
	it('loads the depositor account at the deposit PDA', async () => {
		const deposit = fetcher({ amount: BigInt(25), claimed: false })

		const read = await readEolDeposit(deposit, mint, owner)

		const address = eolDepositPda(eolConfigPda(mint), owner)
		expect(deposit.fetchNullable).toHaveBeenCalledWith(address)
		expect(read?.address.equals(address)).toBe(true)
		expect(read?.account).toEqual({ amount: BigInt(25), claimed: false })
	})

	it('returns null when the wallet has no deposit account', async () => {
		await expect(readEolDeposit(fetcher(null), mint, owner)).resolves.toBeNull()
	})
})

describe('readOwnerTokenBalances', () => {
	it('merges SPL and Token-2022 balances and drops empty accounts', async () => {
		const getParsedTokenAccountsByOwner = vi.fn(async (_owner: PublicKey, filter: { programId: PublicKey }) => {
			if (filter.programId.equals(TOKEN_PROGRAM_ID)) {
				return {
					value: [
						{
							account: {
								data: {
									parsed: {
										info: { mint: 'UsdcMint111111111111111111111111111111111', tokenAmount: { uiAmount: 20 } }
									}
								}
							}
						}
					]
				}
			}
			return {
				value: [
					{
						account: {
							data: {
								parsed: {
									info: { mint: 'EolMint1111111111111111111111111111111111', tokenAmount: { uiAmount: 1.5 } }
								}
							}
						}
					},
					{
						account: {
							data: {
								parsed: { info: { mint: 'DustMint11111111111111111111111111111111', tokenAmount: { uiAmount: 0 } } }
							}
						}
					}
				]
			}
		})

		const balances = await readOwnerTokenBalances({ getParsedTokenAccountsByOwner } as never, owner)

		expect(getParsedTokenAccountsByOwner).toHaveBeenCalledWith(owner, { programId: TOKEN_PROGRAM_ID }, 'confirmed')
		expect(getParsedTokenAccountsByOwner).toHaveBeenCalledWith(owner, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed')
		expect(balances).toEqual([
			{ mint: 'UsdcMint111111111111111111111111111111111', amount: 20 },
			{ mint: 'EolMint1111111111111111111111111111111111', amount: 1.5 }
		])
	})
})
