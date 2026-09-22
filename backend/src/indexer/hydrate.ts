import type { LaunchStatus } from "../catalog/types.ts";
import { encodeBase58 } from "./base58.ts";
import type { LaunchHydrateInput, LaunchHydration, LaunchHydrator } from "./types.ts";

export const LAUNCH_DISC = Buffer.from([144, 51, 51, 163, 206, 85, 213, 38]);

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
};

export function mapFactoryStatus(value: number): LaunchStatus | null {
  return FACTORY_STATUS[value] ?? null;
}

function readPubkey(data: Buffer, offset: number): string {
  return encodeBase58(data.subarray(offset, offset + 32));
}

function readString(data: Buffer, offset: number): { value: string; next: number } | null {
  if (offset + 4 > data.length) return null;
  const length = data.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + length;
  if (length > 64 || end > data.length) return null;
  return { value: data.subarray(start, end).toString("utf8"), next: end };
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
  };
}

export type AccountReader = {
  getAccounts: (keys: string[]) => Promise<Array<Uint8Array | null>>;
  backingMints?: Record<string, string>;
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
        return {
          name: decoded.name,
          symbol: decoded.symbol,
          creator: decoded.creator,
          backing: labels[decoded.backingMint] ?? decoded.backingMint,
          status: decoded.status,
          metadataUri: null,
          logoUrl: null,
          description: "",
          socials: { website: null, twitter: null, telegram: null, discord: null },
          launchedAt: decoded.launchedAt || input.blockTime || 0,
          eolConfig: decoded.eolConfig,
          targetRaiseUsdc: decoded.targetRaiseUsdc,
        };
      }
      return null;
    },
  };
}
