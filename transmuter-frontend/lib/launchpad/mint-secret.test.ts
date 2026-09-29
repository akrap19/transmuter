import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  clearMintSecret,
  clearPendingWire,
  loadMintSecret,
  loadPendingWire,
  saveMintSecret,
  savePendingWire,
} from "./mint-secret";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("mint secret session storage", () => {
  it("round-trips the mint secret for a launch and drops it when wiring no longer needs it", () => {
    const storage = memoryStorage();
    const mint = Keypair.generate();

    saveMintSecret(storage, 4, mint.secretKey);
    const loaded = loadMintSecret(storage, 4);
    expect(loaded).not.toBeNull();
    expect(Keypair.fromSecretKey(loaded!).publicKey.equals(mint.publicKey)).toBe(true);
    expect(loadMintSecret(storage, 5)).toBeNull();

    clearMintSecret(storage, 4);
    expect(loadMintSecret(storage, 4)).toBeNull();
  });

  it("ignores a stored secret that is not a keypair", () => {
    const storage = memoryStorage();
    storage.setItem("transmuter.mint-secret.4", "not-a-keypair");
    expect(loadMintSecret(storage, 4)).toBeNull();
  });

  it("remembers the launch so a refresh can resume wiring", () => {
    const storage = memoryStorage();
    savePendingWire(storage, {
      launchId: 4,
      mint: "Mint111111111111111111111111111111111111111",
      tokenName: "Aero",
      tokenTicker: "AERO",
      backingName: "cSOL",
    });

    expect(loadPendingWire(storage)).toEqual({
      launchId: 4,
      mint: "Mint111111111111111111111111111111111111111",
      tokenName: "Aero",
      tokenTicker: "AERO",
      backingName: "cSOL",
    });

    clearPendingWire(storage);
    expect(loadPendingWire(storage)).toBeNull();
  });
});
