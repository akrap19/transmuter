import type { ConnectionConfig } from '@solana/web3.js'

/** Public devnet hosts. A 429 on one is that host's quota, so the next host is tried once. */
export const PUBLIC_DEVNET_RPCS = ['https://api.devnet.solana.com', 'https://devnet.rpcpool.com'] as const

type RpcBody = {
	id?: unknown
	error?: { code?: number; message?: unknown }
	result?: unknown
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input
	if (input instanceof URL) return input.href
	return input.url
}

export function rpcFailoverOrder(url: string, endpoints: readonly string[] = PUBLIC_DEVNET_RPCS): string[] {
	const rest = endpoints.filter((endpoint) => endpoint !== url && !url.startsWith(endpoint))
	return [url, ...rest]
}

async function readRpcBody(res: Response): Promise<RpcBody | null> {
	const type = res.headers.get('content-type') ?? ''
	if (!type.includes('json') && res.status !== 429) return null
	try {
		return (await res.clone().json()) as RpcBody
	} catch {
		return null
	}
}

/** A host answer web3.js cannot use: HTTP 429, or a JSON-RPC error whose id is not a string. */
function shouldFailover(res: Response, body: RpcBody | null): boolean {
	if (res.status === 429) return true
	if (!body?.error) return false
	const message = typeof body.error.message === 'string' ? body.error.message : ''
	if (body.error.code === 429 || /rate limit|too many requests/i.test(message)) return true
	return typeof body.id !== 'string'
}

function rpcErrorResponse(message: string): Response {
	return new Response(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code: 429, message },
			id: '0'
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } }
	)
}

function readyHosts(url: string, endpoints: readonly string[], cooledUntil: Map<string, number>, now: number): string[] {
	return rpcFailoverOrder(url, endpoints).filter((endpoint) => (cooledUntil.get(endpoint) ?? 0) <= now)
}

export function createDevnetFailoverFetch(options?: {
	fetchImpl?: FetchLike
	now?: () => number
	sleep?: (ms: number) => Promise<void>
	cooldownMs?: number
	endpoints?: readonly string[]
}): FetchLike {
	const fetchImpl = options?.fetchImpl ?? fetch
	const now = options?.now ?? Date.now
	const sleep = options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
	const cooldownMs = options?.cooldownMs ?? 15_000
	const endpoints = options?.endpoints ?? PUBLIC_DEVNET_RPCS
	const cooledUntil = new Map<string, number>()

	return async (input, init) => {
		const url = requestUrl(input)
		let order = readyHosts(url, endpoints, cooledUntil, now())
		if (order.length === 0) {
			const soonest = Math.min(...rpcFailoverOrder(url, endpoints).map((endpoint) => cooledUntil.get(endpoint) ?? 0))
			const wait = soonest - now()
			if (wait > 0) await sleep(wait)
			order = readyHosts(url, endpoints, cooledUntil, now())
		}
		if (order.length === 0) return rpcErrorResponse('Connection rate limits exceeded')

		let last: Response | null = null
		for (let index = 0; index < order.length; index += 1) {
			const endpoint = order[index]
			const res = await fetchImpl(endpoint, init)
			const body = await readRpcBody(res)
			if (!shouldFailover(res, body)) {
				cooledUntil.delete(endpoint)
				return res
			}
			cooledUntil.set(endpoint, now() + cooldownMs)
			const hasNext = index < order.length - 1
			if (!hasNext) {
				if (body?.error && typeof body.id !== 'string') {
					const message = typeof body.error.message === 'string' ? body.error.message : 'Connection rate limits exceeded'
					return rpcErrorResponse(message)
				}
				return res
			}
			await res.arrayBuffer().catch(() => undefined)
			last = res
		}
		return last ?? rpcErrorResponse('Connection rate limits exceeded')
	}
}

export const solanaConnectionConfig: ConnectionConfig = {
	commitment: 'confirmed',
	disableRetryOnRateLimit: true,
	fetch: createDevnetFailoverFetch()
}
