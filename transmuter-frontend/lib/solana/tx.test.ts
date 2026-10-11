import { Keypair, SystemProgram, Transaction, type VersionedTransaction } from '@solana/web3.js'
import { describe, expect, it, vi } from 'vitest'
import {
	type BatchSigner,
	ChainTransactionError,
	describeChainError,
	signAllSendAndConfirm,
	signSendAndConfirm
} from '@/lib/solana/tx'

const SIGNATURE = '5'.repeat(88)
const BLOCKHASH = Keypair.generate().publicKey.toBase58()

function connection(overrides: Record<string, unknown> = {}) {
	return {
		getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: BLOCKHASH, lastValidBlockHeight: 99 }),
		sendRawTransaction: vi.fn().mockResolvedValue(SIGNATURE),
		confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
		getTransaction: vi.fn().mockResolvedValue(null),
		...overrides
	}
}

function signerFor(keypair = Keypair.generate()) {
	return {
		publicKey: keypair.publicKey,
		signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
			if (!(tx instanceof Transaction)) throw new Error('test signer only signs legacy transactions')
			tx.partialSign(keypair)
			return tx
		}
	}
}

function transfer(feePayer = Keypair.generate()) {
	const tx = new Transaction().add(
		SystemProgram.transfer({
			fromPubkey: feePayer.publicKey,
			toPubkey: feePayer.publicKey,
			lamports: 0
		})
	)
	return { tx, feePayer }
}

describe('describeChainError', () => {
	it('maps a wallet rejection to a cancellation', () => {
		const error = Object.assign(new Error('User rejected the request.'), { name: 'WalletSignTransactionError' })

		expect(describeChainError(error)).toEqual({ message: 'Transaction cancelled in the wallet.' })
	})

	it('prefers the Anchor error message and code carried on the error', () => {
		const error = Object.assign(new Error('raw'), {
			error: { errorMessage: 'bad launch params', errorCode: { code: 'BadParams', number: 6002 } }
		})

		expect(describeChainError(error)).toEqual({ message: 'bad launch params', code: 'BadParams' })
	})

	it('reads an Anchor error out of program logs', () => {
		const error = Object.assign(new Error('Simulation failed'), {
			logs: [
				'Program log: AnchorError thrown in factory. Error Code: BadStatus. Error Number: 6027. Error Message: bad launch status.'
			]
		})

		expect(describeChainError(error)).toEqual({ message: 'bad launch status', code: 'BadStatus' })
	})

	it('names expiry and a missing fee balance', () => {
		expect(describeChainError(new Error('Transaction simulation failed: Blockhash not found'))).toEqual({
			message: 'The transaction expired before it was confirmed. Try again.'
		})
		expect(describeChainError(new Error('Transfer: insufficient lamports 1, need 5000'))).toEqual({
			message: 'The wallet does not have enough SOL to pay the fee.'
		})
	})

	it('reports a custom program error when logs do not include an Anchor message', () => {
		expect(describeChainError({ InstructionError: [0, { Custom: 6002 }] })).toEqual({
			message: 'The program rejected the transaction (error 6002).',
			code: '6002'
		})
	})
})

describe('signSendAndConfirm', () => {
	it('signs, sends, confirms, and returns an explorer link', async () => {
		const rpc = connection()
		const { tx, feePayer } = transfer()

		const result = await signSendAndConfirm({
			connection: rpc as never,
			signer: signerFor(feePayer),
			transaction: tx,
			networkName: 'devnet'
		})

		expect(result).toEqual({
			signature: SIGNATURE,
			explorerUrl: `https://explorer.solana.com/tx/${SIGNATURE}?cluster=devnet`
		})
		expect(rpc.getLatestBlockhash).toHaveBeenCalledWith('confirmed')
		expect(tx.feePayer?.equals(feePayer.publicKey)).toBe(true)
		expect(tx.recentBlockhash).toBe(BLOCKHASH)
		expect(rpc.confirmTransaction).toHaveBeenCalledWith(
			{ signature: SIGNATURE, blockhash: BLOCKHASH, lastValidBlockHeight: 99 },
			'confirmed'
		)
	})

	it('partial-signs extra signers before the wallet signs', async () => {
		const rpc = connection()
		const payer = Keypair.generate()
		const mint = Keypair.generate()
		const tx = new Transaction().add({
			keys: [
				{ pubkey: payer.publicKey, isSigner: true, isWritable: true },
				{ pubkey: mint.publicKey, isSigner: true, isWritable: true }
			],
			programId: SystemProgram.programId,
			data: Buffer.alloc(0)
		})

		await signSendAndConfirm({
			connection: rpc as never,
			signer: signerFor(payer),
			transaction: tx,
			signers: [mint]
		})

		const raw = rpc.sendRawTransaction.mock.calls[0]?.[0] as Uint8Array
		const decoded = Transaction.from(raw)
		expect(decoded.signatures.map((entry) => entry.publicKey.toBase58()).sort()).toEqual(
			[payer.publicKey.toBase58(), mint.publicKey.toBase58()].sort()
		)
		expect(decoded.signatures.every((entry) => entry.signature !== null)).toBe(true)
	})

	it('does not send when the wallet rejects the signature', async () => {
		const rpc = connection()
		const { tx, feePayer } = transfer()

		await expect(
			signSendAndConfirm({
				connection: rpc as never,
				signer: {
					publicKey: feePayer.publicKey,
					signTransaction: async () => {
						throw Object.assign(new Error('User rejected the request.'), { name: 'WalletSignTransactionError' })
					}
				},
				transaction: tx
			})
		).rejects.toMatchObject({
			name: 'ChainTransactionError',
			message: 'Transaction cancelled in the wallet.'
		})
		expect(rpc.sendRawTransaction).not.toHaveBeenCalled()
	})

	it('maps a failed confirmation and keeps the explorer link', async () => {
		const rpc = connection({
			confirmTransaction: vi.fn().mockResolvedValue({
				value: { err: { InstructionError: [0, { Custom: 6027 }] } }
			}),
			getTransaction: vi.fn().mockResolvedValue({
				meta: {
					logMessages: [
						'Program log: AnchorError thrown in factory. Error Code: BadStatus. Error Number: 6027. Error Message: bad launch status.'
					]
				}
			})
		})
		const { tx, feePayer } = transfer()

		const error = await signSendAndConfirm({
			connection: rpc as never,
			signer: signerFor(feePayer),
			transaction: tx,
			networkName: 'devnet'
		}).catch((caught: unknown) => caught)

		expect(error).toBeInstanceOf(ChainTransactionError)
		expect(error).toMatchObject({
			message: 'bad launch status',
			code: 'BadStatus',
			signature: SIGNATURE,
			explorerUrl: `https://explorer.solana.com/tx/${SIGNATURE}?cluster=devnet`
		})
	})

	it('maps a simulation failure that already has a signature', async () => {
		const rpc = connection({
			sendRawTransaction: vi.fn().mockRejectedValue(
				Object.assign(new Error('Simulation failed'), {
					signature: SIGNATURE,
					logs: [
						'Program log: AnchorError thrown in factory. Error Code: NotWired. Error Number: 6031. Error Message: wiring incomplete; SALE is unreachable.'
					]
				})
			)
		})
		const { tx, feePayer } = transfer()

		await expect(
			signSendAndConfirm({
				connection: rpc as never,
				signer: signerFor(feePayer),
				transaction: tx,
				networkName: 'devnet'
			})
		).rejects.toMatchObject({
			message: 'wiring incomplete; SALE is unreachable',
			code: 'NotWired',
			signature: SIGNATURE,
			explorerUrl: `https://explorer.solana.com/tx/${SIGNATURE}?cluster=devnet`
		})
	})
})

describe('signAllSendAndConfirm', () => {
	function batchSigner(keypair: Keypair, signAll = true) {
		const calls = { signAll: 0, single: 0 }
		const signer: BatchSigner = {
			publicKey: keypair.publicKey,
			signTransaction: async (tx) => {
				calls.single += 1
				return signerFor(keypair).signTransaction(tx)
			},
			...(signAll
				? {
						signAllTransactions: async (txs) => {
							calls.signAll += 1
							for (const tx of txs) if (tx instanceof Transaction) tx.partialSign(keypair)
							return txs
						}
					}
				: {})
		}
		return { signer, calls }
	}

	it('asks the wallet once for every transaction, then sends them in order', async () => {
		const rpc = connection({
			sendRawTransaction: vi.fn().mockResolvedValueOnce('a'.repeat(88)).mockResolvedValueOnce('b'.repeat(88))
		})
		const payer = Keypair.generate()
		const { signer, calls } = batchSigner(payer)
		const progress = vi.fn()

		const result = await signAllSendAndConfirm({
			connection: rpc as never,
			signer,
			transactions: [transfer(payer).tx, transfer(payer).tx],
			networkName: 'devnet',
			onProgress: progress
		})

		expect(calls.signAll).toBe(1)
		expect(rpc.getLatestBlockhash).toHaveBeenCalledTimes(1)
		expect(result.map((entry) => entry.signature)).toEqual(['a'.repeat(88), 'b'.repeat(88)])
		expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]])
	})

	it('stops at the failed step and names it', async () => {
		const rpc = connection({
			sendRawTransaction: vi
				.fn()
				.mockResolvedValueOnce(SIGNATURE)
				.mockRejectedValueOnce(new Error('Transaction simulation failed: custom program error: 0x1771'))
		})
		const payer = Keypair.generate()

		const error = await signAllSendAndConfirm({
			connection: rpc as never,
			signer: batchSigner(payer).signer,
			transactions: [transfer(payer).tx, transfer(payer).tx, transfer(payer).tx]
		}).catch((caught: unknown) => caught)

		expect(error).toBeInstanceOf(ChainTransactionError)
		expect((error as Error).message).toMatch(/^Step 2 of 3 failed: /)
		expect(rpc.sendRawTransaction).toHaveBeenCalledTimes(2)
	})

	it('does not send anything when the wallet rejects the batch', async () => {
		const rpc = connection()
		const payer = Keypair.generate()
		const signer = {
			...signerFor(payer),
			signAllTransactions: async () => {
				throw Object.assign(new Error('User rejected the request.'), { name: 'WalletSignTransactionError' })
			}
		}

		await expect(
			signAllSendAndConfirm({ connection: rpc as never, signer, transactions: [transfer(payer).tx] })
		).rejects.toMatchObject({ message: 'Transaction cancelled in the wallet.' })
		expect(rpc.sendRawTransaction).not.toHaveBeenCalled()
	})

	it('reports an unsupported batch without sending, so the caller can sign step by step', async () => {
		const rpc = connection()
		const payer = Keypair.generate()
		const { signer } = batchSigner(payer, false)

		await expect(
			signAllSendAndConfirm({ connection: rpc as never, signer, transactions: [transfer(payer).tx, transfer(payer).tx] })
		).rejects.toMatchObject({ name: 'BatchSigningUnsupported' })
		expect(rpc.sendRawTransaction).not.toHaveBeenCalled()
	})

	it('treats a wallet refusal of the batch as a cancel, not as unsupported', async () => {
		const rpc = connection()
		const payer = Keypair.generate()
		const signer = {
			...signerFor(payer),
			signAllTransactions: async () => {
				throw Object.assign(new Error('User rejected the request.'), { name: 'WalletSignTransactionError' })
			}
		}

		const error = await signAllSendAndConfirm({ connection: rpc as never, signer, transactions: [transfer(payer).tx] }).catch(
			(caught: unknown) => caught
		)
		expect(error).not.toMatchObject({ name: 'BatchSigningUnsupported' })
		expect(error).toMatchObject({ message: 'Transaction cancelled in the wallet.' })
	})

	it('treats any other batch refusal as unsupported and sends nothing', async () => {
		const rpc = connection()
		const payer = Keypair.generate()
		const signer = {
			...signerFor(payer),
			signAllTransactions: async () => {
				throw new Error('Wallet does not support signAllTransactions for this account')
			}
		}

		await expect(
			signAllSendAndConfirm({ connection: rpc as never, signer, transactions: [transfer(payer).tx] })
		).rejects.toMatchObject({ name: 'BatchSigningUnsupported' })
		expect(rpc.sendRawTransaction).not.toHaveBeenCalled()
	})
})
