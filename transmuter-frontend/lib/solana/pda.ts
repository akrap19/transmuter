import { PublicKey } from '@solana/web3.js'

export function findPda(programId: PublicKey, ...seeds: Array<Buffer | Uint8Array>): PublicKey {
	return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

export function u64LeBytes(n: number | bigint): Buffer {
	const bytes = new Uint8Array(8)
	new DataView(bytes.buffer).setBigUint64(0, BigInt(n), true)
	return Buffer.from(bytes)
}
