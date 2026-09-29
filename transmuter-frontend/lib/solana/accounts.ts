import type { Connection, PublicKey } from '@solana/web3.js'
import { tokenBalancesFromParsedAccounts } from '@/lib/catalog/token-accounts'
import type { TokenAccountBalance } from '@/lib/catalog/types'
import { eolConfigPda, eolDepositPda } from '@/lib/solana/programs/eol-token'
import { factoryMintIndexPda, launchPda } from '@/lib/solana/programs/factory'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@/lib/solana/spl-token'

export type AccountFetcher<T> = {
	fetchNullable: (address: PublicKey) => Promise<T | null>
}

export type OnChainAccount<T> = {
	address: PublicKey
	account: T
}

type LaunchIdAccount = {
	launchId: { toString(): string }
}

async function readAccount<T>(fetcher: AccountFetcher<T>, address: PublicKey): Promise<OnChainAccount<T> | null> {
	const account = await fetcher.fetchNullable(address)
	if (!account) return null
	return { address, account }
}

export function readFactoryLaunch<T>(
	launch: AccountFetcher<T>,
	launchId: number | bigint
): Promise<OnChainAccount<T> | null> {
	return readAccount(launch, launchPda(launchId))
}

export async function readFactoryLaunchByMint<T>(
	accounts: { launch: AccountFetcher<T>; mintIndex: AccountFetcher<LaunchIdAccount> },
	mint: PublicKey
): Promise<(OnChainAccount<T> & { launchId: bigint }) | null> {
	const index = await readAccount(accounts.mintIndex, factoryMintIndexPda(mint))
	if (!index) return null
	const launchId = BigInt(index.account.launchId.toString())
	const launch = await readFactoryLaunch(accounts.launch, launchId)
	if (!launch) return null
	return { ...launch, launchId }
}

export function readEolConfig<T>(config: AccountFetcher<T>, mint: PublicKey): Promise<OnChainAccount<T> | null> {
	return readAccount(config, eolConfigPda(mint))
}

export function readEolDeposit<T>(
	deposit: AccountFetcher<T>,
	mint: PublicKey,
	depositor: PublicKey
): Promise<OnChainAccount<T> | null> {
	return readAccount(deposit, eolDepositPda(eolConfigPda(mint), depositor))
}

type TokenAccountConnection = Pick<Connection, 'getParsedTokenAccountsByOwner'>

/** SPL and Token-2022 balances. `getParsedTokenAccountsByOwner` is jsonParsed `getTokenAccountsByOwner`. */
export async function readOwnerTokenBalances(
	connection: TokenAccountConnection,
	owner: PublicKey
): Promise<TokenAccountBalance[]> {
	const [spl, token2022] = await Promise.all([
		connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, 'confirmed'),
		connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }, 'confirmed')
	])
	return tokenBalancesFromParsedAccounts([...spl.value, ...token2022.value])
}
