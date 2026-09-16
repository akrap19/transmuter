//! Shared protocol constants. Must stay byte-identical across every program
//! that uses them (spec pack shared-constants table). Founder rulings that
//! override the spec pack are marked.

/// Finalize / convertTreasury compute-unit ceiling (Solana max with setComputeUnitLimit).
pub const MAX_COMPUTE_UNITS: u32 = 1_400_000;

/// Token-2022 mint + account type + TLV for empty NonTransferable.
/// Must match `getMintLen([ExtensionType.NonTransferable])` exactly.
pub const NON_TRANSFERABLE_MINT_SPACE: usize = 170;

/// cToken mint premium total. FOUNDER RULING: 1.25% (spec pack still says 1.85%).
pub const MINT_PREMIUM_RATE_BPS: u64 = 125;
/// Bare SOL deposit into the reserve. No cSOL minted. Raises redemption ratio.
pub const UNDERLYING_PREMIUM_RATE_BPS: u64 = 100;
/// Protocol revenue skim. Never taken from the reserve.
pub const PROTOCOL_PREMIUM_RATE_BPS: u64 = 25;

/// Launchpad ASK. Sizes the raise. Enforces nothing on-chain.
pub const TREASURY_MIN_PCT: u64 = 10;
/// On-chain accept floor after conversion slippage. Can kill a launch.
pub const TREASURY_ACCEPT_PCT: u64 = 8;
/// Treasury plus LP cash leg, as a share of implied market cap.
pub const COMBINED_BACKING_MIN_PCT: u64 = 18;

pub fn premium_legs_sum_ok() -> bool {
    UNDERLYING_PREMIUM_RATE_BPS + PROTOCOL_PREMIUM_RATE_BPS == MINT_PREMIUM_RATE_BPS
}

pub mod schedule;
pub use schedule::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_legs_sum_exactly() {
        assert!(premium_legs_sum_ok());
    }

    #[test]
    fn founder_rulings_are_pinned_not_the_spec_pack_old_figures() {
        assert_eq!(MINT_PREMIUM_RATE_BPS, 125);
        assert_eq!(UNDERLYING_PREMIUM_RATE_BPS, 100);
        assert_eq!(PROTOCOL_PREMIUM_RATE_BPS, 25);
        assert_ne!(MINT_PREMIUM_RATE_BPS, 185);
        assert_eq!(TREASURY_MIN_PCT, 10);
        assert_eq!(TREASURY_ACCEPT_PCT, 8);
        assert_ne!(TREASURY_MIN_PCT, TREASURY_ACCEPT_PCT);
        assert_eq!(COMBINED_BACKING_MIN_PCT, 18);
        assert_ne!(COMBINED_BACKING_MIN_PCT, 25);
        assert_eq!(MAX_COMPUTE_UNITS, 1_400_000);
        assert_eq!(NON_TRANSFERABLE_MINT_SPACE, 170);
    }
}
