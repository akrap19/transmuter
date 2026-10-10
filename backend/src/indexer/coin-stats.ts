import { decodeBase58, encodeBase58 } from "./base58.ts";
import { getMultipleAccounts, rpcCall, type RpcFetch } from "./rpc.ts";
import type { IndexWriteStore } from "./types.ts";

/** Anchor `Deposit` discriminator, base58. */
const DEPOSIT_DISC = "RrLVbqSxfbp";
const SOL_SCALE = BigInt(1_000_000_000);

export type LaunchStatRef = {
  mint: string;
  eolConfig: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
};

type ConfigBalances = {
  decimals: number;
  salePrice: bigint;
  totalSupply: bigint;
  saleTokens: bigint;
  soldTokens: bigint;
  solResidue: bigint;
  escrowUsdc: bigint;
  oraclePrice: bigint;
  oracleExpo: number;
  saleUsdcVault: string;
  treasuryUsdc: string;
  ctokenTreasury: string;
};

/** Same mark as the coin page: USDC counts even when leftover SOL has no oracle. */
export function backingRatioBps(input: {
  unconvertedUsdcAtoms: bigint;
  ctokenAtoms: bigint;
  solResidueLamports: bigint;
  oraclePrice: bigint;
  oracleExpo: number;
  totalSupplyAtoms: bigint;
  salePriceAtoms: bigint;
  decimals: number;
}): number | null {
  const solUsd = oracleToUsdcAtoms(input.oraclePrice, input.oracleExpo);
  const marked = solUsd == null ? BigInt(0) : ((input.ctokenAtoms + input.solResidueLamports) * solUsd) / SOL_SCALE;
  const backingAtoms = marked + input.unconvertedUsdcAtoms;
  if (input.decimals < 0 || input.decimals > 18) return null;
  const fdvAtoms = (input.totalSupplyAtoms * input.salePriceAtoms) / BigInt(10) ** BigInt(input.decimals);
  const unpricedCtoken = solUsd == null && input.ctokenAtoms > BigInt(0);
  if (fdvAtoms <= BigInt(0) || unpricedCtoken) return null;
  return Number((backingAtoms * BigInt(10_000)) / fdvAtoms);
}

export function decodeConfigBalances(data: Uint8Array): ConfigBalances | null {
  const buf = Buffer.from(data);
  if (buf.length < 838) return null;
  return {
    decimals: buf.readUInt8(520),
    salePrice: buf.readBigUInt64LE(522),
    totalSupply: buf.readBigUInt64LE(530),
    saleTokens: buf.readBigUInt64LE(538),
    soldTokens: buf.readBigUInt64LE(562),
    solResidue: buf.readBigUInt64LE(658),
    escrowUsdc: buf.readBigUInt64LE(666),
    oraclePrice: buf.readBigInt64LE(818),
    oracleExpo: buf.readInt32LE(834),
    saleUsdcVault: encodeBase58(buf.subarray(8 + 6 * 32, 8 + 7 * 32)),
    treasuryUsdc: encodeBase58(buf.subarray(8 + 10 * 32, 8 + 11 * 32)),
    ctokenTreasury: encodeBase58(buf.subarray(8 + 11 * 32, 8 + 12 * 32)),
  };
}

/**
 * Filled fraction of the sale allocation. A leftover smaller than one USDC atom
 * cannot be bought (`Dust`), so that remainder counts as sold out.
 */
export function saleProgressBps(
  sold: bigint,
  saleTokens: bigint,
  salePrice = BigInt(0),
  decimals = 0,
): number | null {
  if (saleTokens <= BigInt(0)) return null;
  if (sold >= saleTokens) return 10_000;
  const unsold = saleTokens - sold;
  if (salePrice > BigInt(0) && decimals >= 0 && decimals <= 18) {
    const unsoldUsdc = (unsold * salePrice) / BigInt(10) ** BigInt(decimals);
    if (unsoldUsdc === BigInt(0)) return 10_000;
  }
  return Math.min(10_000, Number((sold * BigInt(10_000)) / saleTokens));
}

export function saleQuote(input: { salePrice: bigint; supplyAtoms: bigint; decimals: number }): {
  priceUsd: number | null;
  marketCapUsd: number | null;
} {
  if (input.salePrice <= BigInt(0) || input.decimals < 0 || input.decimals > 18) {
    return { priceUsd: null, marketCapUsd: null };
  }
  const priceUsd = Number(input.salePrice) / 1_000_000;
  const supply = Number(input.supplyAtoms) / 10 ** input.decimals;
  return { priceUsd, marketCapUsd: supply * priceUsd };
}

function mintSupply(data: Uint8Array | null): bigint {
  if (!data || data.length < 44) return BigInt(0);
  return Buffer.from(data.subarray(36, 44)).readBigUInt64LE(0);
}

/** One deposit account per buyer. A zero balance is a full withdrawal. */
export function countDeposits(accounts: Uint8Array[]): number {
  let count = 0;
  for (const data of accounts) {
    if (data.length < 81) continue;
    const amount = Buffer.from(data.subarray(72, 80)).readBigUInt64LE(0);
    if (amount > BigInt(0)) count++;
  }
  return count;
}

export function depositConfig(data: Uint8Array): string | null {
  if (data.length < 40) return null;
  return encodeBase58(data.subarray(8, 40));
}

/** RPC rejects a batch when any address does not decode to 32 bytes. */
export function isPubkey(value: string): boolean {
  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

function oracleToUsdcAtoms(price: bigint, expo: number): bigint | null {
  if (price <= BigInt(0)) return null;
  const exp = expo + 6;
  if (exp > 18 || exp < -18) return null;
  if (exp >= 0) return price * BigInt(10) ** BigInt(exp);
  return price / BigInt(10) ** BigInt(-exp);
}

function tokenAmount(data: Uint8Array | null): bigint {
  if (!data || data.length < 72) return BigInt(0);
  return Buffer.from(data.subarray(64, 72)).readBigUInt64LE(0);
}

type ProgramAccount = {
  account?: { data?: [string, string] | string };
};

export async function syncCoinStats(options: {
  fetch: RpcFetch;
  rpcUrl: string;
  eolProgramId: string;
  launches: LaunchStatRef[];
  writes: Pick<IndexWriteStore, "recordStats">;
  now?: number;
}): Promise<number> {
  const launches = options.launches.filter((row) => isPubkey(row.eolConfig));
  if (launches.length === 0) return 0;

  const configs = await accountsFor(options, launches.map((row) => row.eolConfig));
  const mints = await accountsFor(options, launches.map((row) => row.mint));
  const decoded = configs.map((raw) => (raw ? decodeConfigBalances(raw) : null));
  const vaultKeys = decoded.flatMap((row) =>
    row ? [row.saleUsdcVault, row.treasuryUsdc, row.ctokenTreasury] : [],
  );
  const vaultData = await accountsFor(options, vaultKeys);
  const vaultBalances = new Map<string, bigint>();
  vaultKeys.forEach((key, index) => {
    vaultBalances.set(key, tokenAmount(vaultData[index] ?? null));
  });

  const depositRows = (await rpcCall(options.fetch, options.rpcUrl, "getProgramAccounts", [
    options.eolProgramId,
    { encoding: "base64", filters: [{ memcmp: { offset: 0, bytes: DEPOSIT_DISC } }] },
  ])) as ProgramAccount[] | null;
  const byConfig = new Map<string, Uint8Array[]>();
  for (const row of depositRows ?? []) {
    const raw = accountBytes(row);
    if (!raw) continue;
    const config = depositConfig(raw);
    if (!config) continue;
    const list = byConfig.get(config) ?? [];
    list.push(raw);
    byConfig.set(config, list);
  }

  const capturedAt = Math.floor((options.now ?? Date.now()) / 1000 / 3600) * 3600;
  let applied = 0;
  for (let index = 0; index < launches.length; index++) {
    const launch = launches[index];
    const config = decoded[index];
    if (!config) continue;
    const unconverted =
      (vaultBalances.get(config.saleUsdcVault) ?? BigInt(0)) +
      (vaultBalances.get(config.treasuryUsdc) ?? BigInt(0)) +
      config.escrowUsdc;
    const supplyAtoms = mintSupply(mints[index] ?? null) || config.totalSupply;
    const quote = saleQuote({ salePrice: config.salePrice, supplyAtoms, decimals: config.decimals });
    await options.writes.recordStats(
      launch.mint,
      {
        priceUsd: launch.priceUsd ?? quote.priceUsd,
        marketCapUsd: quote.marketCapUsd ?? launch.marketCapUsd,
        backingRatioBps: backingRatioBps({
          unconvertedUsdcAtoms: unconverted,
          ctokenAtoms: vaultBalances.get(config.ctokenTreasury) ?? BigInt(0),
          solResidueLamports: config.solResidue,
          oraclePrice: config.oraclePrice,
          oracleExpo: config.oracleExpo,
          totalSupplyAtoms: config.totalSupply,
          salePriceAtoms: config.salePrice,
          decimals: config.decimals,
        }),
        saleProgressBps: saleProgressBps(config.soldTokens, config.saleTokens, config.salePrice, config.decimals),
        holderCount: countDeposits(byConfig.get(launch.eolConfig) ?? []),
      },
      capturedAt,
    );
    applied++;
  }
  return applied;
}

async function accountsFor(
  options: { fetch: RpcFetch; rpcUrl: string },
  keys: string[],
): Promise<Array<Uint8Array | null>> {
  const out: Array<Uint8Array | null> = keys.map(() => null);
  const valid = keys.flatMap((key, index) => (isPubkey(key) ? [{ key, index }] : []));
  for (let start = 0; start < valid.length; start += 100) {
    const chunk = valid.slice(start, start + 100);
    const rows = await getMultipleAccounts(
      options.fetch,
      options.rpcUrl,
      chunk.map((item) => item.key),
    );
    chunk.forEach((item, index) => {
      out[item.index] = rows[index] ?? null;
    });
  }
  return out;
}

function accountBytes(row: ProgramAccount): Uint8Array | null {
  const data = row.account?.data;
  const base64 = Array.isArray(data) ? data[0] : data;
  if (!base64) return null;
  return Buffer.from(base64, "base64");
}
