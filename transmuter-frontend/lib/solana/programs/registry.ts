import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import registryIdl from '@/lib/solana/idl/transmuter_registry.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterRegistry } from '@/lib/solana/types/transmuter_registry'

export type { TransmuterRegistry }

export const REGISTRY_PROGRAM_ID = new PublicKey(PROGRAM_IDS.registry)

export function getRegistryProgram(provider: AnchorProvider): Program<TransmuterRegistry> {
	return new Program(registryIdl as TransmuterRegistry, provider)
}

export function registryConfigPda(): PublicKey {
	return findPda(REGISTRY_PROGRAM_ID, Buffer.from('config'))
}
