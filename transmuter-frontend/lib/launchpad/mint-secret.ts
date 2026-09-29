export type PendingWire = {
  launchId: number;
  mint: string;
  tokenName: string;
  tokenTicker: string;
  backingName: string;
};

const SECRET_PREFIX = "transmuter.mint-secret.";
const PENDING_KEY = "transmuter.pending-wire";

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveMintSecret(storage: KeyValueStore, launchId: number, secret: Uint8Array): void {
  storage.setItem(SECRET_PREFIX + launchId, Buffer.from(secret).toString("base64"));
}

export function loadMintSecret(storage: KeyValueStore, launchId: number): Uint8Array | null {
  const encoded = storage.getItem(SECRET_PREFIX + launchId);
  if (!encoded) return null;
  try {
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length !== 64) return null;
    return bytes;
  } catch {
    return null;
  }
}

export function clearMintSecret(storage: KeyValueStore, launchId: number): void {
  storage.removeItem(SECRET_PREFIX + launchId);
}

export function savePendingWire(storage: KeyValueStore, pending: PendingWire): void {
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function loadPendingWire(storage: KeyValueStore): PendingWire | null {
  const raw = storage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingWire>;
    if (
      typeof parsed.launchId !== "number" ||
      typeof parsed.mint !== "string" ||
      typeof parsed.tokenName !== "string" ||
      typeof parsed.tokenTicker !== "string" ||
      typeof parsed.backingName !== "string"
    ) {
      return null;
    }
    return {
      launchId: parsed.launchId,
      mint: parsed.mint,
      tokenName: parsed.tokenName,
      tokenTicker: parsed.tokenTicker,
      backingName: parsed.backingName,
    };
  } catch {
    return null;
  }
}

export function clearPendingWire(storage: KeyValueStore): void {
  storage.removeItem(PENDING_KEY);
}

export function browserSession(): KeyValueStore | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
