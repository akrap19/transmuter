import type { LaunchStatus, SaleSnapshot } from "./types";

/** USDC atoms. Anchor `u64` values arrive as bigint, number, or BN. */
export type ChainAmount = bigint | number | { toString(): string };

export type LiveSaleInput = {
  factoryStatus: number | null;
  eolStatus: number | null;
  targetRaise: ChainAmount;
  raisedUsdc: ChainAmount;
  salePrice: ChainAmount;
  saleEnd: ChainAmount;
  depositAmount: ChainAmount | null;
  now: number;
};

export type LiveSaleView = {
  status: LaunchStatus;
  sale: SaleSnapshot | null;
  saleProgressBps: number | null;
};

const FACTORY_STATUS = ["created", "wired", "sale", "active", "voided"] as const;
const EOL_STATUS = ["sale", "active", "voided", "liquidating"] as const;
const USDC_SCALE = BigInt(1_000_000);

export function chainAmount(value: ChainAmount): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  return BigInt(value.toString());
}

export function usdcFromAtoms(value: ChainAmount): number {
  return Number(chainAmount(value)) / Number(USDC_SCALE);
}

export function liveStatus(factoryStatus: number | null, eolStatus: number | null): LaunchStatus | null {
  const factory = statusAt(FACTORY_STATUS, factoryStatus);
  const eol = statusAt(EOL_STATUS, eolStatus);
  if (factory === "voided" || eol === "voided") return "voided";
  if (eol === "liquidating") return "liquidating";
  if (factory === "active" || eol === "active") return "active";
  if (factory === "sale" || eol === "sale") return "sale";
  return factory ?? eol;
}

export function liveSaleFromChain(input: LiveSaleInput): LiveSaleView | null {
  const status = liveStatus(input.factoryStatus, input.eolStatus);
  if (!status) return null;

  const capAtoms = chainAmount(input.targetRaise);
  const raisedAtoms = chainAmount(input.raisedUsdc);
  const remainingAtoms = capAtoms > raisedAtoms ? capAtoms - raisedAtoms : BigInt(0);
  const saleProgressBps = progressBps(raisedAtoms, capAtoms);
  const closesAt = Number(chainAmount(input.saleEnd));

  if (status !== "sale") {
    return { status, sale: null, saleProgressBps };
  }

  const remainingUsdc = usdcFromAtoms(remainingAtoms);
  return {
    status,
    saleProgressBps,
    sale: {
      capUsdc: usdcFromAtoms(capAtoms),
      raisedUsdc: usdcFromAtoms(raisedAtoms),
      remainingUsdc,
      priceUsd: usdcFromAtoms(input.salePrice),
      closesAt,
      depositsOpen: input.now < closesAt && remainingAtoms > BigInt(0),
      myDepositUsdc: input.depositAmount == null ? 0 : usdcFromAtoms(input.depositAmount),
    },
  };
}

function progressBps(raisedAtoms: bigint, capAtoms: bigint): number | null {
  if (capAtoms <= BigInt(0)) return null;
  const bps = Math.min(10_000, Number((raisedAtoms * BigInt(10_000)) / capAtoms));
  if (bps === 0 && raisedAtoms > BigInt(0)) return 1;
  return bps;
}

function statusAt<T extends string>(table: readonly T[], value: number | null): T | null {
  if (value == null || !Number.isInteger(value) || value < 0 || value >= table.length) return null;
  return table[value] ?? null;
}
