import type { BackingLeg } from "../catalog/types.ts";
import { decodeBase58, encodeBase58 } from "./base58.ts";
import { basketFromCreateInstruction, decodeLaunchAccount, LAUNCH_DISC } from "./hydrate.ts";
import { resolveLaunchMetadata, type JsonFetch, type ResolvedMetadata } from "./metadata.ts";
import { rpcCall, type RpcFetch } from "./rpc.ts";
import type { IndexWriteStore, LaunchRecord } from "./types.ts";

type ProgramAccount = {
  pubkey?: string;
  account?: { data?: [string, string] | string };
};

type TxInstruction = { data?: string };

export async function syncFactoryLaunches(options: {
  fetch: RpcFetch;
  rpcUrl: string;
  programId: string;
  writes: IndexWriteStore;
  backingMints?: Record<string, string>;
  fetchJson?: JsonFetch;
  /** Mint → basket already recovered from a create transaction. Null means the tx had none. */
  basketCache?: Map<string, BackingLeg[] | null>;
}): Promise<number> {
  historyBlocked = false;
  const result = (await rpcCall(options.fetch, options.rpcUrl, "getProgramAccounts", [
    options.programId,
    {
      encoding: "base64",
      filters: [{ memcmp: { offset: 0, bytes: encodeBase58(LAUNCH_DISC) } }],
    },
  ])) as ProgramAccount[] | null;

  const labels = options.backingMints ?? {};
  let applied = 0;
  for (const row of result ?? []) {
    const raw = accountBytes(row);
    if (!raw) continue;
    const decoded = decodeLaunchAccount(raw);
    if (!decoded) continue;
    const meta = await resolveLaunchMetadata(decoded.metadataUri, options.fetchJson);
    const record = toRecord(decoded, labels, meta);
    if (!record.backingBasket && row.pubkey) {
      record.backingBasket = await rememberedBasket(options, row.pubkey, decoded.mint);
    }
    await options.writes.upsertLaunch(record);
    applied++;
  }
  return applied;
}

let historyBlocked = false;

async function rememberedBasket(
  options: { fetch: RpcFetch; rpcUrl: string; basketCache?: Map<string, BackingLeg[] | null> },
  address: string,
  mint: string,
): Promise<BackingLeg[] | null> {
  const cached = options.basketCache?.get(mint);
  if (cached !== undefined) return cached;
  if (historyBlocked) return null;
  try {
    const basket = await basketFromLaunchHistory(options.fetch, options.rpcUrl, address);
    options.basketCache?.set(mint, basket);
    return basket;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/429|too many|rate limit/i.test(message)) historyBlocked = true;
    return null;
  }
}

/** The create transaction is the oldest signature on the launch account. */
async function basketFromLaunchHistory(fetchImpl: RpcFetch, rpcUrl: string, address: string): Promise<BackingLeg[] | null> {
  const signatures = (await rpcCall(fetchImpl, rpcUrl, "getSignaturesForAddress", [address, { limit: 1000 }])) as
    | Array<{ signature?: string }>
    | null;
  const oldest = signatures?.[signatures.length - 1]?.signature;
  if (!oldest) return null;
  const tx = await rpcCall(fetchImpl, rpcUrl, "getTransaction", [
    oldest,
    { encoding: "json", maxSupportedTransactionVersion: 0 },
  ]);
  for (const ix of instructionsOf(tx)) {
    if (typeof ix.data !== "string") continue;
    try {
      const basket = basketFromCreateInstruction(decodeBase58(ix.data));
      if (basket) return basket;
    } catch {
      // A non-base58 blob is some other instruction.
    }
  }
  return null;
}

function instructionsOf(tx: unknown): TxInstruction[] {
  if (!tx || typeof tx !== "object") return [];
  const message = (tx as { transaction?: { message?: { instructions?: unknown } } }).transaction?.message;
  return Array.isArray(message?.instructions) ? (message.instructions as TxInstruction[]) : [];
}

function accountBytes(row: ProgramAccount): Uint8Array | null {
  const data = row.account?.data;
  const base64 = Array.isArray(data) ? data[0] : data;
  if (!base64) return null;
  return Buffer.from(base64, "base64");
}

function toRecord(
  decoded: NonNullable<ReturnType<typeof decodeLaunchAccount>>,
  labels: Record<string, string>,
  meta: ResolvedMetadata,
): LaunchRecord {
  return {
    mint: decoded.mint,
    name: decoded.name,
    symbol: decoded.symbol,
    creator: decoded.creator,
    backing: labels[decoded.backingMint] ?? decoded.backingMint,
    backingBasket: decoded.backingBasket,
    status: decoded.status,
    metadataUri: decoded.metadataUri || null,
    logoUrl: meta.logoUrl,
    description: meta.description,
    socials: meta.socials,
    launchedAt: decoded.launchedAt,
    eolConfig: decoded.eolConfig,
    targetRaiseUsdc: decoded.targetRaiseUsdc,
    priceUsd: null,
    marketCapUsd: null,
    backingRatioBps: null,
    saleProgressBps: null,
    holderCount: 0,
  };
}
