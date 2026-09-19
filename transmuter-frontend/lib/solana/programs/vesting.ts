import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import vestingIdl from '@/lib/solana/idl/transmuter_vesting.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterVesting } from '@/lib/solana/types/transmuter_vesting'

export type { TransmuterVesting }

export const VESTING_PROGRAM_ID = new PublicKey(PROGRAM_IDS.vesting)

export function getVestingProgram(provider: AnchorProvider): Program<TransmuterVesting> {
	return new Program(vestingIdl as TransmuterVesting, provider)
}

export function vestingConfigPda(mint: PublicKey): PublicKey {
	return findPda(VESTING_PROGRAM_ID, Buffer.from('config'), mint.toBuffer())
}

export function vestingEntryPda(config: PublicKey, recipient: PublicKey): PublicKey {
	return findPda(VESTING_PROGRAM_ID, Buffer.from('entry'), config.toBuffer(), recipient.toBuffer())
}
