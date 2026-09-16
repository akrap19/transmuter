//! Quantity-priced cToken mint/redeem math. All divisions floor (spec: rounding
//! favours the protocol / remaining backing, never the caller).

use crate::CTokenError;
use anchor_lang::prelude::*;

pub const BPS_DENOM: u128 = 10_000;

pub fn scale(decimals: u8) -> u128 {
    10u128.pow(decimals as u32)
}

/// Lamports of backing per 1 whole token (`10^decimals` base units).
/// Genesis (`supply == 0`) is 1:1.
pub fn backing_per_token(backing_lamports: u64, supply: u64, decimals: u8) -> Result<u128> {
    let s = scale(decimals);
    if supply == 0 {
        return Ok(s);
    }
    (backing_lamports as u128)
        .checked_mul(s)
        .ok_or(error!(CTokenError::ArithmeticOverflow))?
        .checked_div(supply as u128)
        .ok_or(error!(CTokenError::ArithmeticOverflow))
}

pub fn tokens_to_mint(
    underlying_amount: u64,
    bpt: u128,
    premium_bps: u64,
    decimals: u8,
) -> Result<u64> {
    let denom = bpt
        .checked_mul(
            BPS_DENOM
                .checked_add(premium_bps as u128)
                .ok_or(error!(CTokenError::ArithmeticOverflow))?,
        )
        .ok_or(error!(CTokenError::ArithmeticOverflow))?;
    let num = (underlying_amount as u128)
        .checked_mul(scale(decimals))
        .ok_or(error!(CTokenError::ArithmeticOverflow))?
        .checked_mul(BPS_DENOM)
        .ok_or(error!(CTokenError::ArithmeticOverflow))?;
    let tokens = num / denom;
    require!(tokens > 0, CTokenError::Dust);
    u64::try_from(tokens).map_err(|_| error!(CTokenError::ArithmeticOverflow))
}

pub fn base_lamports(tokens: u64, bpt: u128, decimals: u8) -> Result<u64> {
    let raw = (tokens as u128)
        .checked_mul(bpt)
        .ok_or(error!(CTokenError::ArithmeticOverflow))?
        / scale(decimals);
    u64::try_from(raw).map_err(|_| error!(CTokenError::ArithmeticOverflow))
}

pub fn bps_leg(base: u64, bps: u64) -> Result<u64> {
    let raw = (base as u128)
        .checked_mul(bps as u128)
        .ok_or(error!(CTokenError::ArithmeticOverflow))?
        / BPS_DENOM;
    u64::try_from(raw).map_err(|_| error!(CTokenError::ArithmeticOverflow))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn genesis_1_0125_sol_mints_1_csol() {
        let bpt = backing_per_token(0, 0, 9).unwrap();
        assert_eq!(bpt, 1_000_000_000);
        let tokens = tokens_to_mint(1_012_500_000, bpt, 125, 9).unwrap();
        assert_eq!(tokens, 1_000_000_000);
        let base = base_lamports(tokens, bpt, 9).unwrap();
        assert_eq!(base, 1_000_000_000);
        assert_eq!(bps_leg(base, 100).unwrap(), 10_000_000);
        assert_eq!(bps_leg(base, 25).unwrap(), 2_500_000);
    }

    #[test]
    fn extra_lamport_rounds_down_to_same_mint() {
        let bpt = backing_per_token(0, 0, 9).unwrap();
        let tokens = tokens_to_mint(1_012_500_001, bpt, 125, 9).unwrap();
        assert_eq!(tokens, 1_000_000_000);
    }

    #[test]
    fn dust_is_none() {
        let bpt = backing_per_token(0, 0, 9).unwrap();
        assert!(tokens_to_mint(1, bpt, 125, 9).is_err());
    }
}
