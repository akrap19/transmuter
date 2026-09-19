export function formatUsd(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBps(bps: number | null): string {
  if (bps == null) return "—";
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(2)}%`;
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toUpperCase();
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

export function formatUnix(seconds: number): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(seconds * 1000));
}
