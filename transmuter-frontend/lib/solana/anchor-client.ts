import { AnchorProvider } from '@coral-xyz/anchor'
import { Connection, PublicKey, type Transaction, type VersionedTransaction } from '@solana/web3.js'
import { getCtokenProgram } from '@/lib/solana/programs/ctoken'
import { getDaoProgram } from '@/lib/solana/programs/dao'
import { getEolTokenProgram } from '@/lib/solana/programs/eol-token'
import { getFactoryProgram } from '@/lib/solana/programs/factory'
import { getRegistryProgram } from '@/lib/solana/programs/registry'
import { getRunwayEscrowProgram } from '@/lib/solana/programs/runway-escrow'
import { getStakingProgram } from '@/lib/solana/programs/staking'
import { getVestingProgram } from '@/lib/solana/programs/vesting'

export function createTransmuterClient(provider: AnchorProvider) {
	return {
		factory: getFactoryProgram(provider),
		ctoken: getCtokenProgram(provider),
		eolToken: getEolTokenProgram(provider),
		vesting: getVestingProgram(provider),
		runwayEscrow: getRunwayEscrowProgram(provider),
		staking: getStakingProgram(provider),
		registry: getRegistryProgram(provider),
		dao: getDaoProgram(provider)
	}
}

export type TransmuterClient = ReturnType<typeof createTransmuterClient>

export function createReadonlyProvider(connection: Connection, publicKey = PublicKey.default): AnchorProvider {
	const wallet = {
		publicKey,
		async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
			throw new Error(`readonly wallet cannot sign ${tx}`)
		},
		async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
			throw new Error(`readonly wallet cannot sign ${txs.length} transaction(s)`)
		}
	}

	return new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
}
