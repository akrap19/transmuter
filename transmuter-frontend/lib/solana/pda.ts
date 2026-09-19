import { PublicKey } from '@solana/web3.js'

export function findPda(programId: PublicKey, ...seeds: Array<Buffer | Uint8Array>): PublicKey {
	return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

export function u64LeBytes(n: number | bigint): Buffer {
	const buf = Buffer.alloc(8)
	buf.writeBigUInt64LE(BigInt(n))
	return buf
}
