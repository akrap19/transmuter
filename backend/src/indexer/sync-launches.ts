import { encodeBase58 } from "./base58.ts";
import { decodeLaunchAccount, LAUNCH_DISC } from "./hydrate.ts";
import { rpcCall, type RpcFetch } from "./rpc.ts";
import type { IndexWriteStore, LaunchRecord } from "./types.ts";

const EMPTY_SOCIALS = { website: null, twitter: null, telegram: null, discord: null };

type ProgramAccount = {
  account?: { data?: [string, string] | string };
};

export async function syncFactoryLaunches(options: {
  fetch: RpcFetch;
  rpcUrl: string;
  programId: string;
  writes: IndexWriteStore;
  backingMints?: Record<string, string>;
}): Promise<number> {
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
    await options.writes.upsertLaunch(toRecord(decoded, labels));
    applied++;
  }
  return applied;
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
): LaunchRecord {
  return {
    mint: decoded.mint,
    name: decoded.name,
    symbol: decoded.symbol,
    creator: decoded.creator,
    backing: labels[decoded.backingMint] ?? decoded.backingMint,
    status: decoded.status,
    metadataUri: null,
    logoUrl: null,
    description: "",
    socials: EMPTY_SOCIALS,
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
