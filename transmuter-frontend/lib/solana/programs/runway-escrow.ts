import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import escrowIdl from '@/lib/solana/idl/transmuter_runway_escrow.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterRunwayEscrow } from '@/lib/solana/types/transmuter_runway_escrow'

export type { TransmuterRunwayEscrow }

export const RUNWAY_ESCROW_PROGRAM_ID = new PublicKey(PROGRAM_IDS.runwayEscrow)

export function getRunwayEscrowProgram(provider: AnchorProvider): Program<TransmuterRunwayEscrow> {
	return new Program(escrowIdl as TransmuterRunwayEscrow, provider)
}

export function escrowConfigPda(eolToken: PublicKey, usdcMint: PublicKey): PublicKey {
	return findPda(RUNWAY_ESCROW_PROGRAM_ID, Buffer.from('config'), eolToken.toBuffer(), usdcMint.toBuffer())
}
