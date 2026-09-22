import { PublicKey } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@/lib/solana/spl-token'
import {
	ctokenConfigPda,
	ctokenMintAuthorityPda,
	ctokenReservePda,
	ctokenRevenuePda
} from '@/lib/solana/programs/ctoken'
import { daoConfigPda } from '@/lib/solana/programs/dao'
import { eolConfigPda, eolDepositPda, eolMintAuthorityPda, eolRedeemPda } from '@/lib/solana/programs/eol-token'
import { factoryCtokenPda, factoryMintIndexPda, factoryPda, launchPda } from '@/lib/solana/programs/factory'
import { registryConfigPda } from '@/lib/solana/programs/registry'
import { escrowConfigPda } from '@/lib/solana/programs/runway-escrow'
import { stakeAccountPda, stakingConfigPda } from '@/lib/solana/programs/staking'
import { vestingConfigPda, vestingEntryPda } from '@/lib/solana/programs/vesting'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'

const mint = new PublicKey('So11111111111111111111111111111111111111112')
const usdc = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const owner = new PublicKey('11111111111111111111111111111111')

function pda(programId: string, ...seeds: Array<Buffer | Uint8Array>) {
	return PublicKey.findProgramAddressSync(seeds, new PublicKey(programId))[0].toBase58()
}

function u64Le(n: number): Buffer {
	const buf = Buffer.alloc(8)
	buf.writeBigUInt64LE(BigInt(n))
	return buf
}

describe('per-program PDA wrappers', () => {
	it('derives Factory PDAs from the documented seeds', () => {
		expect(factoryPda().toBase58()).toBe(pda(PROGRAM_IDS.factory, Buffer.from('factory')))
		expect(launchPda(7).toBase58()).toBe(pda(PROGRAM_IDS.factory, Buffer.from('launch'), u64Le(7)))
		expect(factoryCtokenPda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.factory, Buffer.from('ctoken'), mint.toBuffer())
		)
		expect(factoryMintIndexPda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.factory, Buffer.from('mint'), mint.toBuffer())
		)
	})

	it('derives cToken PDAs from the documented seeds', () => {
		expect(ctokenMintAuthorityPda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.ctoken, Buffer.from('mint_authority'), mint.toBuffer())
		)
		expect(ctokenConfigPda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.ctoken, Buffer.from('config'), mint.toBuffer())
		)
		expect(ctokenReservePda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.ctoken, Buffer.from('reserve'), mint.toBuffer())
		)
		expect(ctokenRevenuePda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.ctoken, Buffer.from('revenue'), mint.toBuffer())
		)
	})

	it('derives EOL Token PDAs from the documented seeds', () => {
		const config = eolConfigPda(mint)
		expect(config.toBase58()).toBe(pda(PROGRAM_IDS.eolToken, Buffer.from('config'), mint.toBuffer()))
		expect(eolMintAuthorityPda(mint).toBase58()).toBe(
			pda(PROGRAM_IDS.eolToken, Buffer.from('mint_authority'), mint.toBuffer())
		)
		expect(eolDepositPda(config, owner).toBase58()).toBe(
			pda(PROGRAM_IDS.eolToken, Buffer.from('deposit'), config.toBuffer(), owner.toBuffer())
		)
		expect(eolRedeemPda(config, owner).toBase58()).toBe(
			pda(PROGRAM_IDS.eolToken, Buffer.from('redeem'), config.toBuffer(), owner.toBuffer())
		)
	})

	it('derives support and shim config PDAs from the documented seeds', () => {
		const vestingConfig = vestingConfigPda(mint)
		expect(vestingConfig.toBase58()).toBe(
			pda(PROGRAM_IDS.vesting, Buffer.from('config'), mint.toBuffer())
		)
		expect(vestingEntryPda(vestingConfig, owner).toBase58()).toBe(
			pda(PROGRAM_IDS.vesting, Buffer.from('entry'), vestingConfig.toBuffer(), owner.toBuffer())
		)
		expect(escrowConfigPda(mint, usdc).toBase58()).toBe(
			pda(PROGRAM_IDS.runwayEscrow, Buffer.from('config'), mint.toBuffer(), usdc.toBuffer())
		)
		const stakingConfig = stakingConfigPda(mint)
		expect(stakingConfig.toBase58()).toBe(
			pda(PROGRAM_IDS.staking, Buffer.from('config'), mint.toBuffer())
		)
		expect(stakeAccountPda(stakingConfig, owner).toBase58()).toBe(
			pda(PROGRAM_IDS.staking, Buffer.from('stake'), stakingConfig.toBuffer(), owner.toBuffer())
		)
		expect(registryConfigPda().toBase58()).toBe(pda(PROGRAM_IDS.registry, Buffer.from('config')))
		expect(daoConfigPda().toBase58()).toBe(pda(PROGRAM_IDS.dao, Buffer.from('config')))
	})
})

describe('spl-token helpers', () => {
	it('exposes the canonical SPL and Token-2022 program ids', () => {
		expect(TOKEN_PROGRAM_ID.toBase58()).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
		expect(TOKEN_2022_PROGRAM_ID.toBase58()).toBe('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
	})
})
