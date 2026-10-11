import {
	type Connection,
	type PublicKey,
	type Signer,
	Transaction,
	type VersionedTransaction
} from '@solana/web3.js'
import { explorerTxUrl, type SolanaCluster, solanaNetworkName } from '@/lib/solana/config'

export type TransactionSigner = {
	publicKey: PublicKey
	signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>
}

export type ConfirmedTransaction = {
	signature: string
	explorerUrl: string
}

export class ChainTransactionError extends Error {
	readonly signature?: string
	readonly explorerUrl?: string
	readonly code?: string

	constructor(
		message: string,
		details: { signature?: string; explorerUrl?: string; code?: string; cause?: unknown } = {}
	) {
		super(message, details.cause === undefined ? undefined : { cause: details.cause })
		this.name = 'ChainTransactionError'
		this.signature = details.signature
		this.explorerUrl = details.explorerUrl
		this.code = details.code
	}
}

type TxConnection = Pick<Connection, 'getLatestBlockhash' | 'sendRawTransaction' | 'confirmTransaction' | 'getTransaction'>

const ANCHOR_MESSAGE = /Error Message:\s*([^\n.]+)/
const ANCHOR_CODE = /Error Code:\s*([A-Za-z0-9_]+)/
const CUSTOM_ERROR = /"Custom"\s*:\s*(\d+)|custom program error:\s*(?:0x([0-9a-f]+)|(\d+))/i

export function describeChainError(error: unknown): { message: string; code?: string } {
	if (error instanceof ChainTransactionError) return { message: error.message, code: error.code }

	const anchor = anchorFields(error)
	if (anchor?.message) return anchor

	const text = errorText(error)
	if (isUserRejection(error, text)) return { message: 'Transaction cancelled in the wallet.' }

	const anchorMessage = text.match(ANCHOR_MESSAGE)?.[1]?.trim()
	if (anchorMessage) return { message: anchorMessage, code: text.match(ANCHOR_CODE)?.[1] }

	if (/blockhash not found|block height exceeded|transaction expired/i.test(text)) {
		return { message: 'The transaction expired before it was confirmed. Try again.' }
	}
	if (/insufficient funds|insufficient lamports/i.test(text)) {
		return { message: 'The wallet does not have enough SOL to pay the fee.' }
	}

	const custom = text.match(CUSTOM_ERROR)
	if (custom) {
		const code = custom[1] ?? (custom[2] ? String(parseInt(custom[2], 16)) : custom[3])
		return { message: `The program rejected the transaction (error ${code}).`, code }
	}

	if (error instanceof Error && error.message.trim()) return { message: error.message }
	return { message: 'The transaction failed.' }
}

export async function signSendAndConfirm(input: {
	connection: TxConnection
	signer: TransactionSigner
	transaction: Transaction | VersionedTransaction
	signers?: Signer[]
	networkName?: SolanaCluster
}): Promise<ConfirmedTransaction> {
	const networkName = input.networkName ?? solanaNetworkName
	const latest = await input.connection.getLatestBlockhash('confirmed')
	const { transaction } = input

	if (transaction instanceof Transaction) {
		transaction.feePayer = input.signer.publicKey
		transaction.recentBlockhash = latest.blockhash
		if (input.signers?.length) transaction.partialSign(...input.signers)
	}

	let signed: Transaction | VersionedTransaction
	try {
		signed = await input.signer.signTransaction(transaction)
	} catch (error) {
		throw toChainError(error)
	}

	return sendAndConfirm(input.connection, signed, latest, networkName)
}

export type BatchSigner = TransactionSigner & {
	signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>
}

/**
 * Sign every transaction with one wallet approval, then send and confirm them in
 * order. Later transactions are simulated by the RPC only after the earlier ones
 * landed, so they may depend on the earlier ones' state. A wallet without
 * `signAllTransactions` gets one prompt per transaction instead.
 */
export async function signAllSendAndConfirm(input: {
	connection: TxConnection
	signer: BatchSigner
	transactions: Transaction[]
	networkName?: SolanaCluster
	onProgress?: (done: number, total: number) => void
}): Promise<ConfirmedTransaction[]> {
	const networkName = input.networkName ?? solanaNetworkName
	const total = input.transactions.length
	const confirmed: ConfirmedTransaction[] = []
	input.onProgress?.(0, total)

	if (!input.signer.signAllTransactions) {
		for (const transaction of input.transactions) {
			confirmed.push(
				await signSendAndConfirm({ connection: input.connection, signer: input.signer, transaction, networkName })
			)
			input.onProgress?.(confirmed.length, total)
		}
		return confirmed
	}

	const latest = await input.connection.getLatestBlockhash('confirmed')
	for (const transaction of input.transactions) {
		transaction.feePayer = input.signer.publicKey
		transaction.recentBlockhash = latest.blockhash
	}

	let signed: Transaction[]
	try {
		signed = await input.signer.signAllTransactions(input.transactions)
	} catch (error) {
		throw toChainError(error)
	}

	for (const [index, transaction] of signed.entries()) {
		try {
			confirmed.push(await sendAndConfirm(input.connection, transaction, latest, networkName))
		} catch (error) {
			const chainError = toChainError(error)
			throw new ChainTransactionError(`Step ${index + 1} of ${total} failed: ${chainError.message}`, {
				signature: chainError.signature,
				explorerUrl: chainError.explorerUrl,
				code: chainError.code,
				cause: error
			})
		}
		input.onProgress?.(confirmed.length, total)
	}
	return confirmed
}

async function sendAndConfirm(
	connection: TxConnection,
	signed: Transaction | VersionedTransaction,
	latest: { blockhash: string; lastValidBlockHeight: number },
	networkName: SolanaCluster
): Promise<ConfirmedTransaction> {
	let signature: string
	try {
		signature = await connection.sendRawTransaction(signed.serialize(), {
			skipPreflight: false,
			preflightCommitment: 'confirmed'
		})
	} catch (error) {
		const failedSignature = signatureOf(error)
		throw toChainError(
			error,
			failedSignature ? { signature: failedSignature, explorerUrl: explorerTxUrl(failedSignature, networkName) } : undefined
		)
	}

	const explorerUrl = explorerTxUrl(signature, networkName)
	const blockhash = signed instanceof Transaction ? (signed.recentBlockhash ?? latest.blockhash) : signed.message.recentBlockhash

	let confirmation: Awaited<ReturnType<Connection['confirmTransaction']>>
	try {
		confirmation = await connection.confirmTransaction(
			{ signature, blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
			'confirmed'
		)
	} catch (error) {
		throw toChainError(error, { signature, explorerUrl })
	}

	if (confirmation.value.err) {
		const logs = await logsFor(connection, signature)
		throw toChainError({ message: JSON.stringify(confirmation.value.err), logs }, { signature, explorerUrl })
	}

	return { signature, explorerUrl }
}

function toChainError(
	error: unknown,
	details?: { signature?: string; explorerUrl?: string }
): ChainTransactionError {
	if (error instanceof ChainTransactionError) return error
	const described = describeChainError(error)
	return new ChainTransactionError(described.message, { ...details, code: described.code, cause: error })
}

function anchorFields(error: unknown): { message: string; code?: string } | null {
	if (!error || typeof error !== 'object' || !('error' in error)) return null
	const inner = error.error
	if (!inner || typeof inner !== 'object') return null
	const message = 'errorMessage' in inner && typeof inner.errorMessage === 'string' ? inner.errorMessage : undefined
	const errorCode = 'errorCode' in inner ? inner.errorCode : undefined
	const code =
		errorCode && typeof errorCode === 'object' && 'code' in errorCode && typeof errorCode.code === 'string'
			? errorCode.code
			: undefined
	if (!message) return null
	return { message, code }
}

function errorText(error: unknown): string {
	if (typeof error === 'string') return error
	if (!error || typeof error !== 'object') return String(error ?? '')
	const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
	const logs =
		'logs' in error && Array.isArray(error.logs) ? error.logs.filter((line) => typeof line === 'string').join('\n') : ''
	let json = ''
	try {
		json = JSON.stringify(error)
	} catch {
		json = ''
	}
	return [message, logs, json].filter(Boolean).join('\n')
}

function isUserRejection(error: unknown, text: string): boolean {
	const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
	if (name === 'WalletSignTransactionError' || name === 'WalletSendTransactionError') return true
	return /user rejected|user denied|rejected the request/i.test(text)
}

function signatureOf(error: unknown): string | undefined {
	if (error && typeof error === 'object' && 'signature' in error && typeof error.signature === 'string') {
		return error.signature
	}
	return undefined
}

async function logsFor(connection: TxConnection, signature: string): Promise<string[] | undefined> {
	try {
		const tx = await connection.getTransaction(signature, {
			commitment: 'confirmed',
			maxSupportedTransactionVersion: 0
		})
		return tx?.meta?.logMessages ?? undefined
	} catch {
		return undefined
	}
}
