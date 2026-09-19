import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import factoryIdl from '@/lib/solana/idl/transmuter_factory.json'
import { findPda, u64LeBytes } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterFactory } from '@/lib/solana/types/transmuter_factory'

export type { TransmuterFactory }

export const FACTORY_PROGRAM_ID = new PublicKey(PROGRAM_IDS.factory)

export function getFactoryProgram(provider: AnchorProvider): Program<TransmuterFactory> {
	return new Program(factoryIdl as TransmuterFactory, provider)
}

export function factoryPda(): PublicKey {
	return findPda(FACTORY_PROGRAM_ID, Buffer.from('factory'))
}

export function launchPda(launchId: number | bigint): PublicKey {
	return findPda(FACTORY_PROGRAM_ID, Buffer.from('launch'), u64LeBytes(launchId))
}

export function factoryCtokenPda(mint: PublicKey): PublicKey {
	return findPda(FACTORY_PROGRAM_ID, Buffer.from('ctoken'), mint.toBuffer())
}
