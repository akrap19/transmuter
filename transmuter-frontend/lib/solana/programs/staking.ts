import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import stakingIdl from '@/lib/solana/idl/transmuter_staking.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterStaking } from '@/lib/solana/types/transmuter_staking'

export type { TransmuterStaking }

export const STAKING_PROGRAM_ID = new PublicKey(PROGRAM_IDS.staking)

export function getStakingProgram(provider: AnchorProvider): Program<TransmuterStaking> {
	return new Program(stakingIdl as TransmuterStaking, provider)
}

export function stakingConfigPda(mint: PublicKey): PublicKey {
	return findPda(STAKING_PROGRAM_ID, Buffer.from('config'), mint.toBuffer())
}

export function stakeAccountPda(config: PublicKey, owner: PublicKey): PublicKey {
	return findPda(STAKING_PROGRAM_ID, Buffer.from('stake'), config.toBuffer(), owner.toBuffer())
}
