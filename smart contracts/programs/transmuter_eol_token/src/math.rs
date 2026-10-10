//! Finalize gates, LP scaling, and backing reads. Divisions floor (protocol
//! rounding). Percents are whole numbers (8, 10, 18); fee/share figures are bps.

use transmuter_constants::{
    BPS_DENOM, COMBINED_BACKING_MIN_PCT, TREASURY_ACCEPT_PCT, TREASURY_MIN_PCT,
};

pub const BPS: u128 = BPS_DENOM as u128;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GateFail {
    Raise,
    Escrow,
    Lp,
    Treasury,
    Combined,
}

#[derive(Clone, Copy, Debug)]
pub struct GateInput {
    pub total_supply: u64,
    pub sale_tokens: u64,
    pub sold_tokens: u64,
    pub lp_tokens_full: u64,
    pub sale_price: u64,
    pub decimals: u8,
    pub raised: u64,
    pub min_raise: u64,
    pub escrow_need: u64,
    pub lp_usdc_share_bps: u64,
    pub lp_sol_share_bps: u64,
    pub slippage_bps: u64,
    pub mint_premium_bps: u64,
}

#[derive(Clone, Copy, Debug)]
pub struct GateProjection {
    pub f_bps: u64,
    pub lp_paired: u64,
    pub unpaired_lp: u64,
    pub unsold_sale: u64,
    pub post_burn_supply: u64,
    pub mcp: u64,
    pub lp_cash: u64,
    pub lp_cost: u64,
    pub remainder: u64,
    pub treasury_need: u64,
    pub ask_need: u64,
    pub combined_need: u64,
    pub combined: u64,
}

pub fn scale(decimals: u8) -> u128 {
    10u128.pow(decimals as u32)
}

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

pub fn usdc_for_tokens(tokens: u64, sale_price: u64, decimals: u8) -> u64 {
    ((tokens as u128).saturating_mul(sale_price as u128) / scale(decimals)) as u64
}

pub fn tokens_for_usdc(usdc: u64, sale_price: u64, decimals: u8) -> Option<u64> {
    if sale_price == 0 {
        return None;
    }
    let t = (usdc as u128).saturating_mul(scale(decimals)) / sale_price as u128;
    if t == 0 {
        None
    } else {
        Some(t as u64)
    }
}

/// Sold out when another 1-atom USDC deposit cannot fit. Price division can
/// leave a few token atoms that no deposit is able to buy.
pub fn sale_sold_out(sold_tokens: u64, sale_tokens: u64, sale_price: u64, decimals: u8) -> bool {
    if sold_tokens >= sale_tokens {
        return sold_tokens == sale_tokens;
    }
    let remaining = sale_tokens - sold_tokens;
    match tokens_for_usdc(1, sale_price, decimals) {
        Some(step) => step > remaining,
        None => true,
    }
}

pub fn project(input: GateInput) -> Option<GateProjection> {
    if input.sale_tokens == 0 || input.total_supply < input.sale_tokens {
        return None;
    }
    if input.sold_tokens > input.sale_tokens {
        return None;
    }
    let f_bps = (input.sold_tokens as u128)
        .saturating_mul(BPS)
        / input.sale_tokens as u128;
    let lp_paired = ((input.lp_tokens_full as u128).saturating_mul(f_bps) / BPS) as u64;
    let unpaired_lp = input.lp_tokens_full.saturating_sub(lp_paired);
    let unsold_sale = input.sale_tokens.saturating_sub(input.sold_tokens);
    let post_burn_supply = input
        .total_supply
        .saturating_sub(unsold_sale)
        .saturating_sub(unpaired_lp);
    let mcp = usdc_for_tokens(post_burn_supply, input.sale_price, input.decimals);
    let lp_cash = usdc_for_tokens(lp_paired, input.sale_price, input.decimals);
    let l = coeff_l(
        input.lp_usdc_share_bps,
        input.lp_sol_share_bps,
        input.slippage_bps,
    );
    let lp_cost = ((lp_cash as u128).saturating_mul(l) / BPS) as u64;
    let remainder = input
        .raised
        .saturating_sub(input.escrow_need)
        .saturating_sub(lp_cost);
    let g = coeff_g(input.mint_premium_bps, input.slippage_bps);
    let treasury_need = ((mcp as u128)
        .saturating_mul(TREASURY_ACCEPT_PCT as u128)
        .saturating_mul(g)
        / 100
        / BPS) as u64;
    let ask_need = ((mcp as u128)
        .saturating_mul(TREASURY_MIN_PCT as u128)
        .saturating_mul(g)
        / 100
        / BPS) as u64;
    let combined_need = ((mcp as u128).saturating_mul(COMBINED_BACKING_MIN_PCT as u128) / 100) as u64;
    let combined = remainder.saturating_add(lp_cash);
    Some(GateProjection {
        f_bps: f_bps as u64,
        lp_paired,
        unpaired_lp,
        unsold_sale,
        post_burn_supply,
        mcp,
        lp_cash,
        lp_cost,
        remainder,
        treasury_need,
        ask_need,
        combined_need,
        combined,
    })
}

pub fn eval_gates(input: GateInput) -> Result<GateProjection, GateFail> {
    let p = project(input).ok_or(GateFail::Raise)?;
    if input.raised < input.min_raise {
        return Err(GateFail::Raise);
    }
    if input.raised < input.escrow_need {
        return Err(GateFail::Escrow);
    }
    if input.raised < input.escrow_need.saturating_add(p.lp_cost) {
        return Err(GateFail::Lp);
    }
    if p.remainder < p.treasury_need {
        return Err(GateFail::Treasury);
    }
    if p.combined < p.combined_need {
        return Err(GateFail::Combined);
    }
    Ok(p)
}

/// cSOL + unconverted USDC (face) + SOL residue, all in SOL-atomic terms.
/// USDC is converted 1:1 into the same unit the caller already expressed
/// `usdc_in_sol_atoms` in; this helper only adds.
pub fn treasury_value(csol: u64, usdc_in_sol_atoms: u64, sol_residue: u64) -> u64 {
    csol.saturating_add(usdc_in_sol_atoms).saturating_add(sol_residue)
}

pub fn bps_of(amount: u64, bps: u16) -> u64 {
    ((amount as u128).saturating_mul(bps as u128) / BPS) as u64
}

/// Shares of a harvested transfer fee. `legs` is
/// `[lp, treasury, ctoken, protocol, creator, burn]` and those weights are the
/// fee's own basis points (they sum to the mint's transfer-fee rate). Floors
/// each leg; the leftover token goes to protocol.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FeeShares {
    pub lp: u64,
    pub treasury: u64,
    pub ctoken: u64,
    pub protocol: u64,
    pub creator: u64,
    pub burn: u64,
}

pub fn split_transfer_fee(amount: u64, legs: [u16; 6]) -> FeeShares {
    let sum = legs.iter().fold(0u64, |acc, leg| acc.saturating_add(*leg as u64));
    if amount == 0 || sum == 0 {
        return FeeShares {
            lp: 0,
            treasury: 0,
            ctoken: 0,
            protocol: 0,
            creator: 0,
            burn: 0,
        };
    }
    let part = |weight: u16| ((amount as u128) * (weight as u128) / (sum as u128)) as u64;
    let mut shares = FeeShares {
        lp: part(legs[0]),
        treasury: part(legs[1]),
        ctoken: part(legs[2]),
        protocol: part(legs[3]),
        creator: part(legs[4]),
        burn: part(legs[5]),
    };
    let assigned = shares
        .lp
        .saturating_add(shares.treasury)
        .saturating_add(shares.ctoken)
        .saturating_add(shares.protocol)
        .saturating_add(shares.creator)
        .saturating_add(shares.burn);
    shares.protocol = shares.protocol.saturating_add(amount.saturating_sub(assigned));
    shares
}

/// Split the cToken-reserve slice of a fee across `[SOL, BTC, GOLD, S&P]`.
/// Weights are basis points of the basket (sum 10_000). The leftover unit stays
/// on the first leg that has weight, which is SOL whenever SOL is in the basket.
pub fn split_basket(amount: u64, weights: [u16; 4]) -> [u64; 4] {
    let sum = weights.iter().fold(0u64, |acc, w| acc.saturating_add(*w as u64));
    if amount == 0 || sum == 0 {
        return [0; 4];
    }
    let mut legs = [0u64; 4];
    let mut assigned = 0u64;
    for (i, weight) in weights.iter().enumerate() {
        legs[i] = ((amount as u128) * (*weight as u128) / (sum as u128)) as u64;
        assigned = assigned.saturating_add(legs[i]);
    }
    let rest = amount.saturating_sub(assigned);
    if rest > 0 {
        if let Some(i) = weights.iter().position(|weight| *weight > 0) {
            legs[i] = legs[i].saturating_add(rest);
        }
    }
    legs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sellout() -> GateInput {
        // 1_000_000 whole tokens, 9 decimals, $1 = 1_000_000 USDC atomic.
        let supply = 1_000_000 * 1_000_000_000u64;
        GateInput {
            total_supply: supply,
            sale_tokens: supply / 4,      // 25%
            sold_tokens: supply / 4,
            lp_tokens_full: supply / 10,  // 10%
            sale_price: 1_000_000,
            decimals: 9,
            raised: 250_000 * 1_000_000, // 25% * $1
            min_raise: 0,
            escrow_need: 0,
            lp_usdc_share_bps: 5_000,
            lp_sol_share_bps: 5_000,
            slippage_bps: 50,
            mint_premium_bps: 125,
        }
    }

    #[test]
    fn sellout_pairs_full_lp_and_clears_floors() {
        let p = eval_gates(sellout()).expect("sellout must pass");
        assert_eq!(p.unpaired_lp, 0);
        assert_eq!(p.unsold_sale, 0);
        assert_eq!(p.lp_paired, sellout().lp_tokens_full);
        assert!(p.remainder >= p.treasury_need);
        assert!(p.combined >= p.combined_need);
        assert!(p.ask_need > p.treasury_need);
    }

    #[test]
    fn subscription_scales_lp_tokens_not_the_price() {
        let mut mid = sellout();
        mid.sold_tokens = mid.sale_tokens * 70 / 100;
        mid.raised = usdc_for_tokens(mid.sold_tokens, mid.sale_price, mid.decimals);
        let p = eval_gates(mid).expect("70%");
        assert_eq!(p.lp_paired, mid.lp_tokens_full * 70 / 100);
        let listing = p.lp_cash as u128 * scale(9) / p.lp_paired as u128;
        assert_eq!(listing, mid.sale_price as u128);
    }

    #[test]
    fn memecoin_shape_fails_combined_while_treasury_clears() {
        let supply = 1_000_000 * 1_000_000_000u64;
        let sale = supply * 60 / 100;
        let f_bps = 560; // 5.6%
        let sold = (sale as u128 * f_bps / BPS) as u64;
        let mut input = sellout();
        input.sale_tokens = sale;
        input.sold_tokens = sold;
        input.raised = usdc_for_tokens(sold, input.sale_price, 9);
        input.lp_tokens_full = supply / 10;
        let p = project(input).unwrap();
        assert!(p.remainder >= p.treasury_need, "treasury should clear");
        assert!(p.combined < p.combined_need, "combined must fail");
        assert_eq!(eval_gates(input).unwrap_err(), GateFail::Combined);
    }

    #[test]
    fn max_lp_shape_fails_treasury_while_combined_clears() {
        let supply = 1_000_000 * 1_000_000_000u64;
        let sale = supply * 25 / 100;
        let lp = supply * 1_469 / 10_000; // 14.69%
        let f_bps = 6_170; // 61.7%
        let sold = (sale as u128 * f_bps / BPS) as u64;
        let mut input = sellout();
        input.sale_tokens = sale;
        input.sold_tokens = sold;
        input.lp_tokens_full = lp;
        input.raised = usdc_for_tokens(sold, input.sale_price, 9);
        let p = project(input).unwrap();
        assert!(p.combined >= p.combined_need, "combined should clear");
        assert!(p.remainder < p.treasury_need, "treasury must fail");
        assert_eq!(eval_gates(input).unwrap_err(), GateFail::Treasury);
    }

    #[test]
    fn named_escrow_and_lp_failures() {
        let mut e = sellout();
        e.escrow_need = e.raised + 1;
        assert_eq!(eval_gates(e).unwrap_err(), GateFail::Escrow);
        let mut lp = sellout();
        lp.raised = 1;
        lp.min_raise = 0;
        lp.escrow_need = 0;
        assert_eq!(eval_gates(lp).unwrap_err(), GateFail::Lp);
    }

    #[test]
    fn unsellable_remainder_counts_as_sold_out() {
        // $0.375939, 9 decimals: 1 USDC atom buys 2660 token atoms.
        // A filled $4.999988 cap leaves 1863 atoms, which no deposit can buy.
        assert!(sale_sold_out(13_299_998_137, 13_300_000_000, 375_939, 9));
        assert!(sale_sold_out(40, 40, 375_939, 9));
        assert!(!sale_sold_out(10, 40, 1_000_000, 6));
        assert!(!sale_sold_out(41, 40, 375_939, 9));
    }

    #[test]
    fn backing_read_counts_unconverted_usdc() {
        assert_eq!(treasury_value(0, 1_000, 50), 1_050);
        assert_eq!(treasury_value(500, 0, 0), 500);
    }

    #[test]
    fn transfer_fee_split_uses_the_leg_weights_and_gives_the_remainder_to_protocol() {
        // 10_000 withheld tokens, default legs 15/20/10/15 (sum 60).
        let shares = split_transfer_fee(10_000, [15, 20, 10, 15, 0, 0]);
        assert_eq!(shares.lp, 2_500);
        assert_eq!(shares.treasury, 3_333);
        assert_eq!(shares.ctoken, 1_666);
        assert_eq!(shares.creator, 0);
        assert_eq!(shares.burn, 0);
        assert_eq!(shares.protocol, 2_501);
        assert_eq!(
            shares.lp + shares.treasury + shares.ctoken + shares.protocol + shares.creator + shares.burn,
            10_000
        );
    }

    #[test]
    fn ctoken_fee_slice_follows_the_basket_and_keeps_the_remainder_on_sol() {
        // 1_666 tokens of the cToken slice. Basket 50% SOL, 0 BTC, 25% gold, 25% S&P.
        let legs = split_basket(1_666, [5_000, 0, 2_500, 2_500]);
        assert_eq!(legs, [834, 0, 416, 416]);
    }
}
