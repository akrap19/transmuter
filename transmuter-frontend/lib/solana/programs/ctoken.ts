import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import ctokenIdl from '@/lib/solana/idl/transmuter_ctoken.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterCtoken } from '@/lib/solana/types/transmuter_ctoken'

export type { TransmuterCtoken }

export const CTOKEN_PROGRAM_ID = new PublicKey(PROGRAM_IDS.ctoken)

export function getCtokenProgram(provider: AnchorProvider): Program<TransmuterCtoken> {
	return new Program(ctokenIdl as TransmuterCtoken, provider)
}

export function ctokenMintAuthorityPda(mint: PublicKey): PublicKey {
	return findPda(CTOKEN_PROGRAM_ID, Buffer.from('mint_authority'), mint.toBuffer())
}

export function ctokenConfigPda(mint: PublicKey): PublicKey {
	return findPda(CTOKEN_PROGRAM_ID, Buffer.from('config'), mint.toBuffer())
}

export function ctokenReservePda(mint: PublicKey): PublicKey {
	return findPda(CTOKEN_PROGRAM_ID, Buffer.from('reserve'), mint.toBuffer())
}

export function ctokenRevenuePda(mint: PublicKey): PublicKey {
	return findPda(CTOKEN_PROGRAM_ID, Buffer.from('revenue'), mint.toBuffer())
}
