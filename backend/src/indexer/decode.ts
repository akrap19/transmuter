import { encodeBase58 } from "./base58.ts";

export const TOKEN_LAUNCHED_DISC = Buffer.from([225, 232, 190, 147, 213, 192, 220, 168]);
export const SALE_DEPOSIT_DISC = Buffer.from([216, 68, 83, 138, 221, 153, 98, 85]);
export const SALE_FINALIZED_DISC = Buffer.from([40, 86, 126, 227, 165, 195, 95, 182]);
export const SALE_VOIDED_DISC = Buffer.from([75, 198, 50, 2, 58, 36, 135, 35]);

export type DecodedEvent =
  | {
      kind: "tokenLaunched";
      launchId: bigint;
      creator: string;
      mint: string;
      eol: string;
    }
  | { kind: "saleVoided" }
  | { kind: "saleFinalized" }
  | { kind: "saleDeposit"; totalRaisedUsdc: bigint };

const PROGRAM_DATA = "Program data: ";

function readPubkey(data: Buffer, offset: number): string {
  return encodeBase58(data.subarray(offset, offset + 32));
}

function eventsFromLog(log: string): DecodedEvent | null {
  if (!log.startsWith(PROGRAM_DATA)) return null;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(log.slice(PROGRAM_DATA.length), "base64");
  } catch {
    return null;
  }
  if (bytes.length < 8) return null;
  const disc = bytes.subarray(0, 8);
  const payload = bytes.subarray(8);

  if (disc.equals(TOKEN_LAUNCHED_DISC)) {
    if (payload.length < 8 + 32 * 6) return null;
    return {
      kind: "tokenLaunched",
      launchId: payload.readBigUInt64LE(0),
      creator: readPubkey(payload, 8),
      mint: readPubkey(payload, 40),
      eol: readPubkey(payload, 72),
    };
  }
  if (disc.equals(SALE_VOIDED_DISC)) return { kind: "saleVoided" };
  if (disc.equals(SALE_FINALIZED_DISC)) return { kind: "saleFinalized" };
  if (disc.equals(SALE_DEPOSIT_DISC)) {
    if (payload.length < 32 + 16) return null;
    return { kind: "saleDeposit", totalRaisedUsdc: payload.readBigUInt64LE(32 + 8) };
  }
  return null;
}

export function decodeLogs(logs: string[]): DecodedEvent[] {
  const events: DecodedEvent[] = [];
  for (const log of logs) {
    const event = eventsFromLog(log);
    if (event) events.push(event);
  }
  return events;
}

