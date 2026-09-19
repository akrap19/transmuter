import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'
import { createReadonlyProvider, createTransmuterClient } from '@/lib/solana/anchor-client'
import factoryIdl from '@/lib/solana/idl/transmuter_factory.json'
import ctokenIdl from '@/lib/solana/idl/transmuter_ctoken.json'
import eolIdl from '@/lib/solana/idl/transmuter_eol_token.json'
import vestingIdl from '@/lib/solana/idl/transmuter_vesting.json'
import escrowIdl from '@/lib/solana/idl/transmuter_runway_escrow.json'
import stakingIdl from '@/lib/solana/idl/transmuter_staking.json'
import registryIdl from '@/lib/solana/idl/transmuter_registry.json'
import daoIdl from '@/lib/solana/idl/transmuter_dao.json'
import { PROGRAM_IDS } from '@/lib/solana/program-ids'

function dummyProvider() {
	const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
	return new AnchorProvider(connection, new Wallet(Keypair.generate()), { commitment: 'confirmed' })
}

describe('createTransmuterClient', () => {
	it('binds each program to the address in its IDL', () => {
		const client = createTransmuterClient(dummyProvider())

		expect(client.factory.programId.toBase58()).toBe(factoryIdl.address)
		expect(client.ctoken.programId.toBase58()).toBe(ctokenIdl.address)
		expect(client.eolToken.programId.toBase58()).toBe(eolIdl.address)
		expect(client.vesting.programId.toBase58()).toBe(vestingIdl.address)
		expect(client.runwayEscrow.programId.toBase58()).toBe(escrowIdl.address)
		expect(client.staking.programId.toBase58()).toBe(stakingIdl.address)
		expect(client.registry.programId.toBase58()).toBe(registryIdl.address)
		expect(client.dao.programId.toBase58()).toBe(daoIdl.address)
	})

	it('keeps frontend program ids identical to the committed IDLs', () => {
		expect(PROGRAM_IDS.factory).toBe(factoryIdl.address)
		expect(PROGRAM_IDS.ctoken).toBe(ctokenIdl.address)
		expect(PROGRAM_IDS.eolToken).toBe(eolIdl.address)
		expect(PROGRAM_IDS.vesting).toBe(vestingIdl.address)
		expect(PROGRAM_IDS.runwayEscrow).toBe(escrowIdl.address)
		expect(PROGRAM_IDS.staking).toBe(stakingIdl.address)
		expect(PROGRAM_IDS.registry).toBe(registryIdl.address)
		expect(PROGRAM_IDS.dao).toBe(daoIdl.address)
	})
})

describe('createReadonlyProvider', () => {
	it('builds an Anchor provider from a connection without a connected wallet', () => {
		const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
		const provider = createReadonlyProvider(connection)

		expect(provider.connection).toBe(connection)
		expect(provider.publicKey.equals(PublicKey.default)).toBe(true)
	})
})
