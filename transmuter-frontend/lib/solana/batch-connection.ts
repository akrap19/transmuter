import type { AccountInfo, Commitment, Connection, GetMultipleAccountsConfig, PublicKey } from "@solana/web3.js";

type AccountContext = { context: { slot: number }; value: AccountInfo<Buffer> | null };

type PendingRead = {
  publicKey: PublicKey;
  resolvers: Array<{ resolve: (result: AccountContext) => void; reject: (error: unknown) => void }>;
};

const MAX_PER_BATCH = 100;

/**
 * Coalesce the many per-account reads a coin page issues into a few
 * getMultipleAccounts calls. Anchor fetchNullable and the manual readers all
 * route through getAccountInfo(AndContext), so one loader collapses a whole
 * refresh into a couple of round trips instead of ~30.
 */
function createAccountLoader(connection: Connection) {
  let pending = new Map<string, PendingRead>();
  let scheduled = false;

  const flush = async () => {
    const batch = [...pending.values()];
    pending = new Map();
    scheduled = false;

    for (let start = 0; start < batch.length; start += MAX_PER_BATCH) {
      const chunk = batch.slice(start, start + MAX_PER_BATCH);
      try {
        const { context, value } = await connection.getMultipleAccountsInfoAndContext(
          chunk.map((entry) => entry.publicKey),
          "confirmed",
        );
        chunk.forEach((entry, index) => {
          const result: AccountContext = { context, value: value[index] ?? null };
          for (const resolver of entry.resolvers) resolver.resolve(result);
        });
      } catch (error) {
        for (const entry of chunk) {
          for (const resolver of entry.resolvers) resolver.reject(error);
        }
      }
    }
  };

  return (publicKey: PublicKey): Promise<AccountContext> =>
    new Promise((resolve, reject) => {
      const key = publicKey.toBase58();
      let entry = pending.get(key);
      if (!entry) {
        entry = { publicKey, resolvers: [] };
        pending.set(key, entry);
      }
      entry.resolvers.push({ resolve, reject });
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    });
}

const cache = new WeakMap<Connection, Connection>();

/** A connection whose account reads batch together, cached per underlying connection. */
export function getBatchedConnection(connection: Connection): Connection {
  const existing = cache.get(connection);
  if (existing) return existing;

  const load = createAccountLoader(connection);

  const batched = new Proxy(connection, {
    get(target, prop, receiver) {
      if (prop === "getAccountInfoAndContext") {
        return (publicKey: PublicKey, _commitment?: Commitment) => load(publicKey);
      }
      if (prop === "getAccountInfo") {
        return async (publicKey: PublicKey, _commitment?: Commitment) => (await load(publicKey)).value;
      }
      if (prop === "getMultipleAccountsInfo") {
        return async (publicKeys: PublicKey[], _config?: Commitment | GetMultipleAccountsConfig) =>
          Promise.all(publicKeys.map(async (publicKey) => (await load(publicKey)).value));
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  cache.set(connection, batched);
  return batched;
}

/** u64 little-endian amount in an SPL / Token-2022 token account (offset 64). */
export function decodeTokenAmount(info: AccountInfo<Buffer> | null): bigint {
  if (!info || info.data.length < 72) return BigInt(0);
  return info.data.readBigUInt64LE(64);
}

/** u64 little-endian supply in an SPL / Token-2022 mint account (offset 36). */
export function decodeMintSupply(info: AccountInfo<Buffer> | null): bigint {
  if (!info || info.data.length < 44) return BigInt(0);
  return info.data.readBigUInt64LE(36);
}
