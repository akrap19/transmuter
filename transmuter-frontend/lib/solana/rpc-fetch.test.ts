import { describe, expect, it } from 'vitest'
import { createDevnetFailoverFetch, rpcFailoverOrder } from './rpc-fetch'

const PRIMARY = 'https://devnet.rpcpool.com'
const FALLBACK = 'https://api.devnet.solana.com'

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	})
}

describe('rpcFailoverOrder', () => {
	it('tries the requested host first, then the other public devnet hosts', () => {
		expect(rpcFailoverOrder(PRIMARY)[0]).toBe(PRIMARY)
		expect(rpcFailoverOrder(PRIMARY)).toContain(FALLBACK)
		expect(rpcFailoverOrder('https://devnet.helius-rpc.com/?api-key=local')).toEqual([
			'https://devnet.helius-rpc.com/?api-key=local',
			FALLBACK,
			PRIMARY
		])
	})
})

describe('createDevnetFailoverFetch', () => {
	it('keeps a successful response on the first host', async () => {
		const calls: string[] = []
		const rpcFetch = createDevnetFailoverFetch({
			endpoints: [PRIMARY, FALLBACK],
			fetchImpl: async (input) => {
				calls.push(String(input))
				return jsonResponse(200, { result: 'ok' })
			}
		})

		const res = await rpcFetch(PRIMARY, { method: 'POST', body: '{}' })

		expect(calls).toEqual([PRIMARY])
		expect(res.status).toBe(200)
	})

	it('moves a rate-limited public host to the next devnet RPC', async () => {
		const calls: string[] = []
		const rpcFetch = createDevnetFailoverFetch({
			endpoints: [PRIMARY, FALLBACK],
			fetchImpl: async (input) => {
				calls.push(String(input))
				if (input === PRIMARY) {
					return jsonResponse(429, {
						jsonrpc: '2.0',
						error: { code: 429, message: 'Connection rate limits exceeded' },
						id: 'req'
					})
				}
				return jsonResponse(200, { result: 'ok' })
			}
		})

		const res = await rpcFetch(PRIMARY, { method: 'POST', body: '{"method":"getAccountInfo"}' })

		expect(calls).toEqual([PRIMARY, FALLBACK])
		expect(await res.json()).toEqual({ result: 'ok' })
	})

	it('skips a host that returns a JSON-RPC error web3.js cannot parse', async () => {
		const calls: string[] = []
		const rpcFetch = createDevnetFailoverFetch({
			endpoints: [PRIMARY, FALLBACK],
			fetchImpl: async (input) => {
				calls.push(String(input))
				if (input === PRIMARY) {
					return jsonResponse(200, {
						jsonrpc: '2.0',
						error: { code: -32000, message: 'Unauthorized: You must authenticate your request with an API key.' },
						id: null
					})
				}
				return jsonResponse(200, { jsonrpc: '2.0', result: 'ok', id: 'test-id' })
			}
		})

		const res = await rpcFetch(PRIMARY, { method: 'POST', body: '{}' })

		expect(calls).toEqual([PRIMARY, FALLBACK])
		expect(await res.json()).toEqual({ jsonrpc: '2.0', result: 'ok', id: 'test-id' })
	})

	it('returns a program error from the first host instead of failing over', async () => {
		const calls: string[] = []
		const rpcFetch = createDevnetFailoverFetch({
			endpoints: [PRIMARY, FALLBACK],
			fetchImpl: async (input) => {
				calls.push(String(input))
				return jsonResponse(200, {
					jsonrpc: '2.0',
					error: { code: -32002, message: 'Transaction simulation failed' },
					id: 'test-id'
				})
			}
		})

		const res = await rpcFetch(PRIMARY, { method: 'POST', body: '{}' })

		expect(calls).toEqual([PRIMARY])
		expect((await res.json()).error.message).toBe('Transaction simulation failed')
	})

	it('runs at most two calls at once', async () => {
		let active = 0
		let max = 0
		const release: Array<() => void> = []
		const rpcFetch = createDevnetFailoverFetch({
			endpoints: [PRIMARY],
			fetchImpl: () =>
				new Promise((resolve) => {
					active += 1
					max = Math.max(max, active)
					release.push(() => {
						active -= 1
						resolve(jsonResponse(200, { jsonrpc: '2.0', result: 'ok', id: 'test-id' }))
					})
				})
		})

		const flush = async () => {
			for (let step = 0; step < 6; step += 1) await Promise.resolve()
		}
		const pending = Promise.all([rpcFetch(PRIMARY), rpcFetch(PRIMARY), rpcFetch(PRIMARY)])
		await flush()
		expect(max).toBe(2)
		expect(release).toHaveLength(2)

		release[0]()
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(max).toBe(2)
		expect(release).toHaveLength(3)

		release[1]()
		release[2]()
		await pending
	})

	it('waits out a cooldown and reads the account from the host once it is open again', async () => {
		let now = 1_000
		const calls: string[] = []
		const rpcFetch = createDevnetFailoverFetch({
			now: () => now,
			sleep: async (ms) => {
				now += ms
			},
			cooldownMs: 15_000,
			endpoints: [PRIMARY, FALLBACK],
			fetchImpl: async (input) => {
				calls.push(String(input))
				if (calls.length <= 2) return jsonResponse(429, { error: { code: 429, message: 'rate limit' } })
				return jsonResponse(200, { jsonrpc: '2.0', result: 'ok', id: 'test-id' })
			}
		})

		await rpcFetch(PRIMARY)
		now = 2_000
		const cooled = await rpcFetch(PRIMARY)

		expect(calls).toEqual([PRIMARY, FALLBACK, PRIMARY])
		expect(await cooled.json()).toMatchObject({ result: 'ok' })
	})
})
