//! Launch feasibility and FIXED sale math. Uses the same g/L coefficients as
//! EOL initialize, against **snapshotted** premium and slippage — never live
//! governance values.

use transmuter_constants::{BPS_DENOM, TREASURY_MIN_PCT};

pub const BPS: u128 = BPS_DENOM as u128;

/// s = 1 + slippage, in bps (10050 for 0.50%).
pub fn coeff_s(slippage_bps: u64) -> u128 {
    BPS.saturating_add(slippage_bps as u128)
}

/// g = (1 + mintPremium) * s, in bps.
pub fn coeff_g(mint_premium_bps: u64, slippage_bps: u64) -> u128 {
    coeff_s(slippage_bps)
        .saturating_mul(BPS.saturating_add(mint_premium_bps as u128))
        / BPS
}

/// L = lpUsdcShare + lpSolShare * s, in bps (10000 = 1.0).
pub fn coeff_l(lp_usdc_share_bps: u64, lp_sol_share_bps: u64, slippage_bps: u64) -> u128 {
    (lp_usdc_share_bps as u128).saturating_add(
        (lp_sol_share_bps as u128).saturating_mul(coeff_s(slippage_bps)) / BPS,
    )
}

pub fn scale(decimals: u8) -> u128 {
    10u128.pow(decimals as u32)
}

pub fn usdc_for_tokens(tokens: u64, sale_price: u64, decimals: u8) -> u64 {
    ((tokens as u128).saturating_mul(sale_price as u128) / scale(decimals)) as u64
}

pub fn bps_tokens(total_supply: u64, bps: u16) -> u64 {
    ((total_supply as u128).saturating_mul(bps as u128) / BPS) as u64
}

/// `lpPct * L + treasuryMinPct(0.10) * g` in the same units as `sale_bps`.
pub fn weighted_bps(
    lp_bps: u16,
    lp_usdc_share_bps: u16,
    lp_sol_share_bps: u16,
    mint_premium_bps: u64,
    slippage_bps: u64,
) -> u128 {
    let g = coeff_g(mint_premium_bps, slippage_bps);
    let l = coeff_l(
        lp_usdc_share_bps as u64,
        lp_sol_share_bps as u64,
        slippage_bps,
    );
    (lp_bps as u128) * l / BPS + (TREASURY_MIN_PCT as u128) * 100 * g / BPS
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Feasibility {
    Ok { min_raise: u64, weighted: u128 },
    Infeasible,
}

/// r31: weighted < sale is always ok; equality is ok only with a zero escrow ask.
pub fn feasibility(
    lp_bps: u16,
    sale_bps: u16,
    lp_usdc_share_bps: u16,
    lp_sol_share_bps: u16,
    mint_premium_bps: u64,
    slippage_bps: u64,
    escrow_funding_need: u64,
) -> Feasibility {
    let weighted = weighted_bps(
        lp_bps,
        lp_usdc_share_bps,
        lp_sol_share_bps,
        mint_premium_bps,
        slippage_bps,
    );
    let sale = sale_bps as u128;
    if weighted > sale {
        return Feasibility::Infeasible;
    }
    if weighted == sale && escrow_funding_need > 0 {
        return Feasibility::Infeasible;
    }
    let min_raise = if escrow_funding_need == 0 {
        0
    } else {
        let denom = sale.saturating_sub(weighted);
        if denom == 0 {
            return Feasibility::Infeasible;
        }
        ((escrow_funding_need as u128) * sale / denom) as u64
    };
    Feasibility::Ok {
        min_raise,
        weighted,
    }
}

/// FIXED: salePrice * salePct * totalSupply == targetRaise (same units as USDC atomic).
pub fn fixed_target_raise(total_supply: u64, sale_bps: u16, sale_price: u64, decimals: u8) -> u64 {
    usdc_for_tokens(bps_tokens(total_supply, sale_bps), sale_price, decimals)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Worked values at founder 1.25% premium and 50 bps SH2, 50/50 LP split.
    const PREMIUM: u64 = 125;
    const SLIP: u64 = 50;

    #[test]
    fn coefficients_match_worked_integers() {
        assert_eq!(coeff_s(SLIP), 10_050);
        assert_eq!(coeff_g(PREMIUM, SLIP), 10_175);
        assert_eq!(coeff_l(5_000, 5_000, SLIP), 10_025);
    }

    #[test]
    fn tightest_legal_sale_has_slack_not_on_the_boundary() {
        // 25% sale, 10% LP. Spec: about 4.7 points of slack vs 25%.
        let w = weighted_bps(1_000, 5_000, 5_000, PREMIUM, SLIP);
        assert_eq!(w, 2_019);
        assert!(w < 2_500);
        match feasibility(1_000, 2_500, 5_000, 5_000, PREMIUM, SLIP, 0) {
            Feasibility::Ok { min_raise, weighted } => {
                assert_eq!(min_raise, 0);
                assert_eq!(weighted, 2_019);
            }
            Feasibility::Infeasible => panic!("backing-only 25/10 must be feasible"),
        }
    }

    #[test]
    fn equality_is_infeasible_when_escrow_asks() {
        // Force equality by using a sale_bps that equals the worked weighted.
        assert_eq!(
            feasibility(1_000, 2_019, 5_000, 5_000, PREMIUM, SLIP, 1),
            Feasibility::Infeasible
        );
        assert!(matches!(
            feasibility(1_000, 2_019, 5_000, 5_000, PREMIUM, SLIP, 0),
            Feasibility::Ok { min_raise: 0, .. }
        ));
    }

    #[test]
    fn weighted_above_sale_is_always_infeasible() {
        assert_eq!(
            feasibility(1_000, 2_000, 5_000, 5_000, PREMIUM, SLIP, 0),
            Feasibility::Infeasible
        );
    }

    #[test]
    fn min_raise_is_back_solved_against_sellout() {
        match feasibility(1_000, 2_500, 5_000, 5_000, PREMIUM, SLIP, 1_000_000) {
            Feasibility::Ok { min_raise, .. } => {
                // 1_000_000 * 2500 / (2500 - 2019) = 2_500_000_000 / 481
                assert_eq!(min_raise, 5_197_505);
            }
            Feasibility::Infeasible => panic!("expected min_raise"),
        }
    }

    #[test]
    fn escrow_zero_min_raise_is_zero() {
        match feasibility(1_000, 7_000, 5_000, 5_000, PREMIUM, SLIP, 0) {
            Feasibility::Ok { min_raise, .. } => assert_eq!(min_raise, 0),
            Feasibility::Infeasible => panic!("backing-only"),
        }
    }

    #[test]
    fn higher_slippage_raises_weighted_so_a_live_change_would_move_the_boundary() {
        let at_snapshot = weighted_bps(4_000, 5_000, 5_000, PREMIUM, SLIP);
        let after_gov = weighted_bps(4_000, 5_000, 5_000, PREMIUM, 5_000);
        assert_eq!(at_snapshot, 5_027);
        assert!(after_gov > 6_000);
        assert!(matches!(
            feasibility(4_000, 6_000, 5_000, 5_000, PREMIUM, SLIP, 0),
            Feasibility::Ok { .. }
        ));
        assert_eq!(
            feasibility(4_000, 6_000, 5_000, 5_000, PREMIUM, 5_000, 0),
            Feasibility::Infeasible
        );
    }

    #[test]
    fn fixed_price_agrees_with_target_raise() {
        let supply = 1_000_000 * 1_000_000_000u64;
        let price = 1_000_000u64;
        assert_eq!(
            fixed_target_raise(supply, 2_500, price, 9),
            250_000_000_000
        );
        assert_eq!(
            fixed_target_raise(supply, 7_000, price, 9),
            700_000_000_000
        );
    }
}
