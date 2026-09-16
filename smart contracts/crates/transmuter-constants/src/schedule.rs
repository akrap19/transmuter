//! Time-lock schedules shared by Vesting and Runway Escrow.

/// 180 days. Spec "6-month cliff".
pub const SIX_MONTHS_SECS: i64 = 180 * 24 * 3600;
pub const TWELVE_MONTHS_SECS: i64 = 365 * 24 * 3600;
pub const EIGHTEEN_MONTHS_SECS: i64 = 365 * 24 * 3600 * 3 / 2;
pub const TWENTY_FOUR_MONTHS_SECS: i64 = 2 * 365 * 24 * 3600;
pub const WALLET_CHANGE_DELAY_SECS: i64 = 48 * 3600;

pub const SCHEDULE_NONE: u8 = 0;
pub const SCHEDULE_CLIFF_6M: u8 = 1;
pub const SCHEDULE_LINEAR_12M: u8 = 2;
pub const SCHEDULE_LINEAR_24M: u8 = 3;
pub const SCHEDULE_CLIFF_6M_LINEAR_18M: u8 = 4;

pub fn schedule_kind_ok(kind: u8) -> bool {
    kind <= SCHEDULE_CLIFF_6M_LINEAR_18M
}

/// Floor. Unstamped (`start == 0`) or `now < start` → 0.
pub fn vested_amount(total: u64, start: i64, now: i64, kind: u8) -> u64 {
    if start == 0 || now < start || total == 0 {
        return 0;
    }
    let elapsed = now.saturating_sub(start);
    match kind {
        SCHEDULE_NONE => total,
        SCHEDULE_CLIFF_6M => {
            if elapsed >= SIX_MONTHS_SECS {
                total
            } else {
                0
            }
        }
        SCHEDULE_LINEAR_12M => linear(total, elapsed, TWELVE_MONTHS_SECS),
        SCHEDULE_LINEAR_24M => linear(total, elapsed, TWENTY_FOUR_MONTHS_SECS),
        SCHEDULE_CLIFF_6M_LINEAR_18M => {
            if elapsed < SIX_MONTHS_SECS {
                0
            } else {
                linear(total, elapsed - SIX_MONTHS_SECS, EIGHTEEN_MONTHS_SECS)
            }
        }
        _ => 0,
    }
}

fn linear(total: u64, elapsed: i64, duration: i64) -> u64 {
    if elapsed <= 0 {
        return 0;
    }
    if elapsed >= duration {
        return total;
    }
    ((total as u128) * (elapsed as u128) / (duration as u128)) as u64
}

#[cfg(test)]
mod schedule_tests {
    use super::*;

    #[test]
    fn none_is_fully_vested_after_start() {
        assert_eq!(vested_amount(1_000, 10, 10, SCHEDULE_NONE), 1_000);
        assert_eq!(vested_amount(1_000, 10, 9, SCHEDULE_NONE), 0);
        assert_eq!(vested_amount(1_000, 0, 50, SCHEDULE_NONE), 0);
    }

    #[test]
    fn twelve_month_linear_is_half_at_six_months() {
        let start = 1_000;
        let mid = start + SIX_MONTHS_SECS;
        let got = vested_amount(1_000_000, start, mid, SCHEDULE_LINEAR_12M);
        assert_eq!(got, 1_000_000 * SIX_MONTHS_SECS as u64 / TWELVE_MONTHS_SECS as u64);
    }
}
