import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import eolIdl from '@/lib/solana/idl/transmuter_eol_token.json'
import { findPda } from '@/lib/solana/pda'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'
import type { TransmuterEolToken } from '@/lib/solana/types/transmuter_eol_token'

export type { TransmuterEolToken }

export const EOL_TOKEN_PROGRAM_ID = new PublicKey(PROGRAM_IDS.eolToken)

export function getEolTokenProgram(provider: AnchorProvider): Program<TransmuterEolToken> {
	return new Program(eolIdl as TransmuterEolToken, provider)
}

export function eolConfigPda(mint: PublicKey): PublicKey {
	return findPda(EOL_TOKEN_PROGRAM_ID, Buffer.from('config'), mint.toBuffer())
}

export function eolMintAuthorityPda(mint: PublicKey): PublicKey {
	return findPda(EOL_TOKEN_PROGRAM_ID, Buffer.from('mint_authority'), mint.toBuffer())
}

export function eolDepositPda(config: PublicKey, depositor: PublicKey): PublicKey {
	return findPda(EOL_TOKEN_PROGRAM_ID, Buffer.from('deposit'), config.toBuffer(), depositor.toBuffer())
}

export function eolRedeemPda(config: PublicKey, user: PublicKey): PublicKey {
	return findPda(EOL_TOKEN_PROGRAM_ID, Buffer.from('redeem'), config.toBuffer(), user.toBuffer())
}
