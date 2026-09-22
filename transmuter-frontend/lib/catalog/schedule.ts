export const SIX_MONTHS_SECS = 180 * 24 * 3600;
export const TWELVE_MONTHS_SECS = 365 * 24 * 3600;
export const EIGHTEEN_MONTHS_SECS = (365 * 24 * 3600 * 3) / 2;
export const TWENTY_FOUR_MONTHS_SECS = 2 * 365 * 24 * 3600;

export const SCHEDULE_NONE = 0;
export const SCHEDULE_CLIFF_6M = 1;
export const SCHEDULE_LINEAR_12M = 2;
export const SCHEDULE_LINEAR_24M = 3;
export const SCHEDULE_CLIFF_6M_LINEAR_18M = 4;

const LABELS = ["None", "6 Month Cliff", "12 Month Linear", "24 Month Linear", "6M Cliff + 18M Linear"] as const;

export function scheduleKindOk(kind: number) {
  return kind >= SCHEDULE_NONE && kind <= SCHEDULE_CLIFF_6M_LINEAR_18M;
}

export function scheduleLabel(kind: number) {
  return LABELS[kind] ?? "Unknown";
}

export function vestedAmount(total: number, start: number, now: number, kind: number) {
  if (start === 0 || now < start || total === 0) return 0;
  const elapsed = now - start;
  if (kind === SCHEDULE_NONE) return total;
  if (kind === SCHEDULE_CLIFF_6M) return elapsed >= SIX_MONTHS_SECS ? total : 0;
  if (kind === SCHEDULE_LINEAR_12M) return linear(total, elapsed, TWELVE_MONTHS_SECS);
  if (kind === SCHEDULE_LINEAR_24M) return linear(total, elapsed, TWENTY_FOUR_MONTHS_SECS);
  if (kind === SCHEDULE_CLIFF_6M_LINEAR_18M) {
    if (elapsed < SIX_MONTHS_SECS) return 0;
    return linear(total, elapsed - SIX_MONTHS_SECS, EIGHTEEN_MONTHS_SECS);
  }
  return 0;
}

function linear(total: number, elapsed: number, duration: number) {
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return total;
  return Math.floor((total * elapsed) / duration);
}
