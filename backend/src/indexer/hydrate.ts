import type { BackingLeg, LaunchStatus } from "../catalog/types.ts";
import { encodeBase58 } from "./base58.ts";
import { resolveLaunchMetadata, type JsonFetch } from "./metadata.ts";
import type { LaunchHydrateInput, LaunchHydration, LaunchHydrator } from "./types.ts";

export const LAUNCH_DISC = Buffer.from([144, 51, 51, 163, 206, 85, 213, 38]);

/** Matches `METADATA_URI_MAX_LEN` in the Factory program. */
export const METADATA_URI_MAX_LEN = 200;

/** Matches `BACKING_ASSET_COUNT` in `transmuter-constants`. */
export const BACKING_ASSET_COUNT = 4;
/** On-chain `BackingLeg` size: asset_kind (u8) + weight_bps (u16). */
const BACKING_LEG_BYTES = 3;

const FACTORY_STATUS: Record<number, LaunchStatus> = {
  0: "created",
  1: "wired",
  2: "sale",
  3: "active",
  4: "voided",
};

export type DecodedLaunch = {
  mint: string;
  creator: string;
  eolConfig: string;
  backingMint: string;
  status: LaunchStatus;
  launchedAt: number;
  targetRaiseUsdc: bigint;
  name: string;
  symbol: string;
  metadataUri: string;
  backingBasket: BackingLeg[] | null;
};

export function mapFactoryStatus(value: number): LaunchStatus | null {
  return FACTORY_STATUS[value] ?? null;
}

function readPubkey(data: Buffer, offset: number): string {
  return encodeBase58(data.subarray(offset, offset + 32));
}

function readString(
  data: Buffer,
  offset: number,
  maxLen = 64,
): { value: string; next: number } | null {
  if (offset + 4 > data.length) return null;
  const length = data.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + length;
  if (length > maxLen || end > data.length) return null;
  return { value: data.subarray(start, end).toString("utf8"), next: end };
}

/** `create_launch` discriminator. The basket is the last field of its params. */
export const CREATE_LAUNCH_DISC = Buffer.from([239, 223, 255, 134, 39, 121, 127, 62]);

/**
 * Fixed `CreateLaunchParams` bytes after the three strings and before the basket:
 * decimals, sale type, prices and supply, the bps splits, escrow and sale window,
 * reserve-mint fields, fees, forfeit dest, vesting schedule.
 */
const PARAMS_BEFORE_BASKET = 1 + 1 + 8 + 8 + 8 + 2 * 7 + 8 + 8 + 2 + 8 * 6 + 2 * 7 + 1 + 1;

/**
 * Backing basket: four legs of `{ asset_kind: u8, weight_bps: u16 }` in canonical
 * order, weights summing to 10_000. Missing bytes, zero padding on older accounts,
 * and any other mix are null.
 */
function readBackingBasket(data: Buffer, offset: number): BackingLeg[] | null {
  const end = offset + BACKING_ASSET_COUNT * BACKING_LEG_BYTES;
  if (offset < 0 || end > data.length) return null;
  const legs: BackingLeg[] = [];
  let sum = 0;
  for (let i = 0; i < BACKING_ASSET_COUNT; i++) {
    const base = offset + i * BACKING_LEG_BYTES;
    const assetKind = data.readUInt8(base);
    const weightBps = data.readUInt16LE(base + 1);
    if (assetKind !== i) return null;
    legs.push({ assetKind, weightBps });
    sum += weightBps;
  }
  return sum === 10_000 ? legs : null;
}

/** Basket from a `create_launch` instruction. Older programs accept the param and do not store it. */
export function basketFromCreateInstruction(data: Uint8Array): BackingLeg[] | null {
  const buf = Buffer.from(data);
  if (buf.length < 16 || !buf.subarray(0, 8).equals(CREATE_LAUNCH_DISC)) return null;
  let offset = 16;
  for (let i = 0; i < 3; i++) {
    if (offset + 4 > buf.length) return null;
    const length = buf.readUInt32LE(offset);
    const end = offset + 4 + length;
    if (length > METADATA_URI_MAX_LEN || end > buf.length) return null;
    offset = end;
  }
  return readBackingBasket(buf, offset + PARAMS_BEFORE_BASKET);
}

export function decodeLaunchAccount(data: Uint8Array): DecodedLaunch | null {
  const buf = Buffer.from(data);
  if (buf.length < 548) return null;
  if (!buf.subarray(0, 8).equals(LAUNCH_DISC)) return null;
  const status = mapFactoryStatus(buf.readUInt8(400));
  if (!status) return null;
  const name = readString(buf, 544);
  if (!name) return null;
  const symbol = readString(buf, name.next);
  if (!symbol) return null;
  // Appended after `symbol` in the Factory `Launch` account. Older accounts
  // created before this field was added simply have no bytes here → "".
  const metadata = readString(buf, symbol.next, METADATA_URI_MAX_LEN);
  // After metadata comes `bump` (u8), then the fixed-size backing basket.
  const backingBasket = metadata ? readBackingBasket(buf, metadata.next + 1) : null;
  return {
    mint: readPubkey(buf, 48),
    creator: readPubkey(buf, 16),
    eolConfig: readPubkey(buf, 80),
    backingMint: readPubkey(buf, 272),
    status,
    launchedAt: Number(buf.readBigInt64LE(405)),
    targetRaiseUsdc: buf.readBigUInt64LE(447),
    name: name.value,
    symbol: symbol.value,
    metadataUri: metadata?.value ?? "",
    backingBasket,
  };
}

export type AccountReader = {
  getAccounts: (keys: string[]) => Promise<Array<Uint8Array | null>>;
  backingMints?: Record<string, string>;
  fetchJson?: JsonFetch;
};

export function createAccountHydrator(reader: AccountReader): LaunchHydrator {
  const labels = reader.backingMints ?? {};
  return {
    async hydrate(input: LaunchHydrateInput): Promise<LaunchHydration | null> {
      if (input.accountKeys.length === 0) return null;
      const accounts = await reader.getAccounts(input.accountKeys);
      for (const raw of accounts) {
        if (!raw) continue;
        const decoded = decodeLaunchAccount(raw);
        if (!decoded || decoded.mint !== input.mint) continue;
        const meta = await resolveLaunchMetadata(decoded.metadataUri, reader.fetchJson);
        return {
          name: decoded.name,
          symbol: decoded.symbol,
          creator: decoded.creator,
          backing: labels[decoded.backingMint] ?? decoded.backingMint,
          status: decoded.status,
          metadataUri: decoded.metadataUri || null,
          logoUrl: meta.logoUrl,
          description: meta.description,
          socials: meta.socials,
          launchedAt: decoded.launchedAt || input.blockTime || 0,
          eolConfig: decoded.eolConfig,
          targetRaiseUsdc: decoded.targetRaiseUsdc,
          backingBasket: decoded.backingBasket,
        };
      }
      return null;
    },
  };
}
