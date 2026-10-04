export function formatUsd(value: number | null): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  const maximumFractionDigits = abs > 0 && abs < 0.005 ? 8 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function formatBps(bps: number | null): string {
  if (bps == null) return "—";
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(2)}%`;
}

const STATUS_LABELS: Record<string, string> = {
  liquidating: "END OF LIFE",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").toUpperCase();
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

export function formatUnix(seconds: number): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(seconds * 1000));
}

export function formatRemaining(closesAt: number, now: number): string {
  const left = Math.floor(closesAt - now);
  if (left <= 0) return "Closed";
  const days = Math.floor(left / 86_400);
  const hours = Math.floor((left % 86_400) / 3_600);
  const minutes = Math.floor((left % 3_600) / 60);
  const seconds = left % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
