import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import daoIdl from '@/lib/solana/idl/transmuter_dao.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterDao } from '@/lib/solana/types/transmuter_dao'

export type { TransmuterDao }

export const DAO_PROGRAM_ID = new PublicKey(PROGRAM_IDS.dao)

export function getDaoProgram(provider: AnchorProvider): Program<TransmuterDao> {
	return new Program(daoIdl as TransmuterDao, provider)
}

export function daoConfigPda(): PublicKey {
	return findPda(DAO_PROGRAM_ID, Buffer.from('config'))
}
