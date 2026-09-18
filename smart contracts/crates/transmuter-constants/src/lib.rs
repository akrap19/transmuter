//! Shared protocol constants. Must stay byte-identical across every program
//! that uses them (spec pack shared-constants table). Founder rulings that
//! override the spec pack are marked.

/// Finalize / convertTreasury compute-unit ceiling (Solana max with setComputeUnitLimit).
pub const MAX_COMPUTE_UNITS: u32 = 1_400_000;

/// Token-2022 mint + account type + TLV for empty NonTransferable.
/// Must match `getMintLen([ExtensionType.NonTransferable])` exactly.
pub const NON_TRANSFERABLE_MINT_SPACE: usize = 170;
/// Token-2022 mint + TransferFeeConfig. Must match
/// `getMintLen([ExtensionType.TransferFeeConfig])` exactly.
pub const TRANSFER_FEE_MINT_SPACE: usize = 278;

pub const BPS_DENOM: u64 = 10_000;

/// SH2 hard cap on every protocol swap (0.50%).
pub const SH2_MAX_SLIPPAGE_BPS: u64 = 50;

/// Pyth / mock_pyth: a print older than this is oracle disagreement (S13).
pub const ORACLE_MAX_STALENESS_SECS: i64 = 120;
/// Confidence / |price| above this (bps) is oracle disagreement (S13).
pub const ORACLE_MAX_CONF_BPS: u64 = 500;

/// Pyth pull receiver (`rec5EKMGg6MxZWaMbitBFZouL8cRSrkNRK57yRpBEVV`).
pub const PYTH_RECEIVER_PROGRAM: [u8; 32] = [
    12, 183, 250, 187, 82, 247, 166, 72, 187, 91, 42, 31, 39, 34, 137, 113, 8, 122, 230, 89, 143,
    231, 124, 152, 134, 157, 30, 186, 174, 44, 240, 200,
];
/// Workspace mock_pyth (`DyMTvcaqzXa5PjCqEyTf3FgWzQ2criPopM9ASXm9RVS5`).
pub const MOCK_PYTH_PROGRAM: [u8; 32] = [
    192, 187, 232, 74, 84, 40, 55, 50, 244, 210, 218, 27, 160, 25, 58, 141, 8, 24, 35, 139, 142, 15,
    245, 135, 41, 208, 57, 209, 246, 241, 172, 94,
];
/// Pinned protocol DEX venue (`B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV`).
pub const MOCK_DEX_PROGRAM: [u8; 32] = [
    148, 182, 191, 162, 4, 177, 223, 125, 92, 212, 145, 44, 184, 183, 83, 191, 189, 187, 245, 212,
    220, 193, 95, 89, 28, 145, 213, 67, 165, 18, 88, 12,
];
/// Raydium CPMM on Solana public-devnet (`CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW`).
pub const RAYDIUM_CPMM_PROGRAM: [u8; 32] = [
    169, 42, 49, 26, 136, 152, 134, 77, 32, 99, 200, 252, 203, 83, 110, 30, 138, 48, 77, 141, 83,
    152, 76, 10, 78, 179, 193, 68, 7, 214, 116, 231,
];
/// Raydium CPMM AmmConfig on public-devnet (`9zSzfkYy6awexsHvmggeH36pfVUdDGyCcwmjT3AQPBj6`).
pub const RAYDIUM_CPMM_AMM_CONFIG: [u8; 32] = [
    133, 148, 254, 76, 78, 52, 206, 247, 143, 191, 153, 193, 196, 159, 191, 131, 75, 191, 127, 200,
    157, 54, 17, 92, 40, 71, 106, 78, 131, 72, 250, 241,
];
/// Wrapped SOL mint (all clusters).
pub const WSOL_MINT: [u8; 32] = [
    6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70, 24, 192, 53, 218, 196, 57, 220, 26,
    235, 59, 85, 152, 160, 240, 0, 0, 0, 0, 1,
];
/// Pyth SOL/USD feed id.
pub const PYTH_SOL_USD_FEED_ID: [u8; 32] = [
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4, 0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc, 0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
];

pub const SALE_PCT_MIN: u64 = 25;
pub const LP_PCT_MIN: u64 = 10;
pub const TEAM_PCT_MAX: u64 = 20;
pub const INVESTOR_PCT_MAX: u64 = 20;
pub const DAO_AIRDROP_PCT_MAX: u64 = 10;
pub const LP_SPLIT_MIN_BPS: u64 = 2_500;
pub const LP_SPLIT_MAX_BPS: u64 = 7_500;

/// Default transfer fee 0.50% = 0.15 LP / 0.15 treasury / 0.05 cToken reserve / 0.15 protocol.
pub const TRANSFER_FEE_DEFAULT_BPS: u16 = 50;
pub const TRANSFER_FEE_MIN_BPS: u16 = 40;
pub const TRANSFER_FEE_MAX_BPS: u16 = 200;
pub const FEE_LP_DEFAULT_BPS: u16 = 15;
pub const FEE_TREASURY_DEFAULT_BPS: u16 = 15;
pub const FEE_CTOKEN_RESERVE_BPS: u16 = 5;
pub const FEE_PROTOCOL_MIN_BPS: u16 = 15;
pub const FEE_PROTOCOL_MAX_BPS: u16 = 25;
pub const FEE_LP_MIN_BPS: u16 = 10;
pub const FEE_TREASURY_MIN_BPS: u16 = 10;
pub const FEE_CREATOR_MAX_BPS: u16 = 50;
pub const FEE_BURN_MIN_BPS: u16 = 5;
pub const FEE_BURN_MAX_BPS: u16 = 100;

/// Sale window [1 day, 60 days].
pub const SALE_WINDOW_MIN_SECS: i64 = 24 * 3600;
pub const SALE_WINDOW_MAX_SECS: i64 = 60 * 24 * 3600;
/// Reserve-mint Path B vote window [24h, 48h].
pub const RESERVE_MINT_VOTE_WINDOW_MIN_SECS: i64 = 24 * 3600;
pub const RESERVE_MINT_VOTE_WINDOW_MAX_SECS: i64 = 48 * 3600;

pub const SALE_TYPE_FIXED: u8 = 0;
/// Forfeit surplus destination. Treasury only; to-LP is illegal.
pub const FORFEIT_DEST_TREASURY: u8 = 0;

pub const REDEMPTION_TREASURY_FEE_BPS: u16 = 35;
pub const REDEMPTION_REVENUE_FEE_BPS: u16 = 15;

/// 2% ceiling. MVP split: 1.75% cToken primary / 0.25% protocol (no gold).
pub const LIQUIDATION_FEE_BPS: u16 = 200;
pub const LIQUIDATION_FEE_CTOKEN_BPS: u16 = 175;
pub const LIQUIDATION_FEE_PROTOCOL_BPS: u16 = 25;

pub const RESERVE_MINT_PROTOCOL_FEE_BPS: u16 = 30;
pub const RESERVE_MINT_DURATION_SECS: i64 = 6 * 3600;
pub const RESERVE_MINT_AUTO_ALLOWANCE_BPS: u16 = 1_500;
pub const RESERVE_MINT_PREMIUM_OPEN_BPS: u16 = 2_000;
pub const RESERVE_MINT_PREMIUM_MIN_BPS: u16 = 300;
pub const RESERVE_MINT_PREMIUM_DECAY_BPS: u16 = 50;
pub const RESERVE_MINT_PREMIUM_DECAY_INTERVAL_SECS: i64 = 30 * 60;
pub const RESERVE_MINT_WORK_THRESHOLD_BPS: u16 = 2_500;
pub const RESERVE_MINT_AUTO_GAP_SECS: i64 = 60 * 24 * 3600;
pub const RESERVE_MINT_MAX_EVENTS_YEAR: u8 = 3;
pub const RESERVE_MINT_ACTIVATE_MIN_PCT: u64 = 5;
pub const RESERVE_MINT_ACTIVATE_MAX_PCT: u64 = 17;
pub const RESERVE_MINT_DEACTIVATE_MIN_PCT: u64 = 20;
pub const RESERVE_MINT_DEACTIVATE_MAX_PCT: u64 = 35;
pub const RESERVE_MINT_GAP_PCT: u64 = 10;
pub const RESERVE_MINT_LOCKOUT_PCT: u64 = 50;
pub const RESERVE_MINT_GOV_MIN_BPS: u16 = 500;
pub const RESERVE_MINT_GOV_MAX_BPS: u16 = 1_500;

pub const LIQ_VOTE_WINDOW_SECS: i64 = 14 * 24 * 3600;
pub const LIQ_HOLDER_PASS_BPS: u16 = 6_700;
pub const LIQ_HOLDER_QUORUM_BPS: u16 = 1_000;
pub const VOTER_LOCK_SECS: i64 = 7 * 24 * 3600;
pub const OVERRIDE_EXECUTION_DELAY_SECS: i64 = 72 * 3600;

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
pub mod governance;
pub use schedule::*;
pub use governance::*;

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
        assert_eq!(TRANSFER_FEE_MINT_SPACE, 278);
        assert_eq!(SH2_MAX_SLIPPAGE_BPS, 50);
        assert_eq!(SALE_PCT_MIN, 25);
        assert_eq!(LP_PCT_MIN, 10);
        assert_eq!(TRANSFER_FEE_DEFAULT_BPS, 50);
        assert_eq!(
            FEE_LP_DEFAULT_BPS + FEE_TREASURY_DEFAULT_BPS + FEE_CTOKEN_RESERVE_BPS + FEE_PROTOCOL_MIN_BPS,
            TRANSFER_FEE_DEFAULT_BPS
        );
        assert_eq!(
            REDEMPTION_TREASURY_FEE_BPS + REDEMPTION_REVENUE_FEE_BPS,
            TRANSFER_FEE_DEFAULT_BPS
        );
        assert_eq!(
            LIQUIDATION_FEE_CTOKEN_BPS + LIQUIDATION_FEE_PROTOCOL_BPS,
            LIQUIDATION_FEE_BPS
        );
        assert_ne!(LIQUIDATION_FEE_CTOKEN_BPS, 150); // gold share folded into primary, not 1.50%
        assert_eq!(TREASURY_ACCEPT_PCT, 8);
        assert_eq!(TREASURY_MIN_PCT, 10);
        assert_eq!(COMBINED_BACKING_MIN_PCT, 18);
        assert_eq!(VOTE_SENSITIVE, 0);
        assert_eq!(VOTE_LIQ_DAO, 5);
        assert_eq!(VOTE_GATE1_FALLBACK, 10);
        assert_eq!(ORACLE_MAX_STALENESS_SECS, 120);
        assert_eq!(ORACLE_MAX_CONF_BPS, 500);
        assert_ne!(ORACLE_MAX_STALENESS_SECS, 0);
        assert_eq!(PYTH_RECEIVER_PROGRAM[0], 12);
        assert_eq!(MOCK_PYTH_PROGRAM[0], 192);
        assert_eq!(MOCK_DEX_PROGRAM[0], 148);
        assert_eq!(RAYDIUM_CPMM_PROGRAM[0], 169);
        assert_eq!(WSOL_MINT[0], 6);
        assert!(community_vote_type(VOTE_LIQ_DAO));
        assert!(!community_vote_type(VOTE_SENSITIVE));
        assert!(!community_vote_type(VOTE_EMERGENCY));
        let prefix = decode_registry_config_prefix(&padded_registry_prefix()).unwrap();
        assert_eq!(prefix.ambassador_count, 0);
        assert!(prefix.genesis_locked);
        assert_eq!(prefix.founders.len(), 0);
    }

    fn padded_registry_prefix() -> Vec<u8> {
        let mut buf = vec![0u8; 8];
        buf.extend_from_slice(&[7u8; 32]);
        buf.extend_from_slice(&0u32.to_le_bytes());
        buf.push(0);
        buf.extend_from_slice(&[9u8; 32]);
        buf.extend_from_slice(&0u32.to_le_bytes());
        buf.extend_from_slice(&7u32.to_le_bytes());
        buf.push(1);
        buf.extend_from_slice(&[0xab; 40]);
        buf
    }
}
