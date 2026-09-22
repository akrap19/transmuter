import type { ChainTx, TokenTransfer } from "./types.ts";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asSlot(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

function asTime(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function accountKeysOf(tx: Record<string, unknown>): string[] {
  const keys = new Set<string>();
  for (const item of asArray(tx.accountData)) {
    const account = asString(asRecord(item)?.account);
    if (account) keys.add(account);
  }
  for (const item of asArray(tx.instructions)) {
    for (const account of asArray(asRecord(item)?.accounts)) {
      if (typeof account === "string") keys.add(account);
    }
  }
  const message = asRecord(asRecord(tx.transaction)?.message);
  for (const key of asArray(message?.accountKeys)) {
    if (typeof key === "string") keys.add(key);
    const parsed = asString(asRecord(key)?.pubkey);
    if (parsed) keys.add(parsed);
  }
  return [...keys];
}

function logsOf(tx: Record<string, unknown>): string[] {
  const direct = asArray(tx.logs).filter((item): item is string => typeof item === "string");
  if (direct.length) return direct;
  const meta = asRecord(tx.meta);
  return asArray(meta?.logMessages).filter((item): item is string => typeof item === "string");
}

function errOf(tx: Record<string, unknown>): unknown {
  if (tx.transactionError != null) return tx.transactionError;
  if (tx.err != null) return tx.err;
  const meta = asRecord(tx.meta);
  return meta?.err ?? undefined;
}

function transfersOf(tx: Record<string, unknown>): TokenTransfer[] {
  const out: TokenTransfer[] = [];
  for (const item of asArray(tx.tokenTransfers)) {
    const rec = asRecord(item);
    const mint = asString(rec?.mint);
    const amount = rec?.tokenAmount ?? rec?.amount;
    const parsed = typeof amount === "number" ? amount : Number(amount);
    if (mint && Number.isFinite(parsed)) out.push({ mint, amount: parsed });
  }
  return out;
}

function parseOne(value: unknown): ChainTx | null {
  const tx = asRecord(value);
  if (!tx) return null;
  const slot = asSlot(tx.slot);
  const signature = asString(tx.signature) ?? asString(tx.sig);
  if (slot == null || !signature) return null;
  const err = errOf(tx);
  return {
    slot,
    signature,
    blockTime: asTime(tx.timestamp) ?? asTime(tx.blockTime) ?? asTime(asRecord(tx.meta)?.blockTime),
    logs: logsOf(tx),
    accountKeys: accountKeysOf(tx),
    tokenTransfers: transfersOf(tx),
    err: err == null ? undefined : err,
  };
}

function payloadItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  if (!rec) return [];
  if (Array.isArray(rec.transactions)) return rec.transactions;
  if (asSlot(rec.slot) != null && (asString(rec.signature) || asString(rec.sig))) return [rec];
  return [];
}

export function parseHeliusPayload(body: unknown): ChainTx[] {
  const txs: ChainTx[] = [];
  for (const item of payloadItems(body)) {
    const tx = parseOne(item);
    if (tx) txs.push(tx);
  }
  return txs;
}
