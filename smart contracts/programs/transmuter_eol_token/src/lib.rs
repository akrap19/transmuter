use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, CreateAccount};
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_2022_extensions::{
    transfer_fee_initialize, transfer_fee_set, TransferFeeInitialize, TransferFeeSetTransferFee,
};
use anchor_spl::token_interface::{
    burn, initialize_mint2, mint_to, Burn, InitializeMint2, Mint, MintTo, TokenAccount,
    TokenInterface, Transfer, TransferChecked,
};
use mock_dex::cpi::accounts::{AddLiquidity, SwapToSol};
use transmuter_constants::*;
use transmuter_ctoken::cpi::accounts::MintForTreasury as CTokenMint;
use transmuter_ctoken::cpi::accounts::Redeem as CTokenRedeem;
use transmuter_ctoken::program::TransmuterCtoken;

mod math;
use math::{
    bps_of, coeff_g, coeff_l, eval_gates, project, tokens_for_usdc, usdc_for_tokens, GateFail,
    GateInput,
};

declare_id!("DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ");

pub const STATUS_SALE: u8 = 0;
pub const STATUS_ACTIVE: u8 = 1;
pub const STATUS_VOIDED: u8 = 2;
pub const STATUS_LIQUIDATING: u8 = 3;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchParams {
    pub decimals: u8,
    pub sale_price: u64,
    pub total_supply: u64,
    pub sale_bps: u16,
    pub lp_bps: u16,
    pub lp_sol_share_bps: u16,
    pub lp_usdc_share_bps: u16,
    pub team_bps: u16,
    pub investor_bps: u16,
    pub dao_bps: u16,
    pub escrow_funding_need: u64,
    pub sale_end: i64,
    pub sh2_max_slippage_bps: u64,
    pub governed_mint_pct_bps: u16,
    pub reserve_mint_activate_pct: u64,
    pub reserve_mint_deactivate_pct: u64,
    pub reserve_mint_duration_secs: i64,
    pub liq_vote_window_secs: i64,
    pub convert_chunk: u64,
}

#[program]
pub mod transmuter_eol_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: LaunchParams) -> Result<()> {
        require!(params.decimals > 0, EolError::BadParams);
        require!(params.sale_price > 0 && params.total_supply > 0, EolError::BadParams);
        require!(params.sale_bps as u64 >= SALE_PCT_MIN * 100, EolError::SalePct);
        require!(params.lp_bps as u64 >= LP_PCT_MIN * 100, EolError::LpPct);
        require!(params.team_bps as u64 <= TEAM_PCT_MAX * 100, EolError::TeamPct);
        require!(params.dao_bps as u64 <= DAO_AIRDROP_PCT_MAX * 100, EolError::DaoPct);
        require!(
            params.lp_sol_share_bps as u64 >= LP_SPLIT_MIN_BPS
                && params.lp_sol_share_bps as u64 <= LP_SPLIT_MAX_BPS,
            EolError::LpSplit
        );
        require!(
            (params.lp_sol_share_bps as u64) + (params.lp_usdc_share_bps as u64) == BPS_DENOM,
            EolError::LpSplit
        );
        let alloc = params.sale_bps as u32
            + params.lp_bps as u32
            + params.team_bps as u32
            + params.investor_bps as u32
            + params.dao_bps as u32;
        require!(alloc == BPS_DENOM as u32, EolError::AllocSum);
        require!(
            params.governed_mint_pct_bps >= RESERVE_MINT_GOV_MIN_BPS
                && params.governed_mint_pct_bps <= RESERVE_MINT_GOV_MAX_BPS,
            EolError::ReservePct
        );
        require!(
            params.reserve_mint_deactivate_pct
                >= params.reserve_mint_activate_pct + RESERVE_MINT_GAP_PCT,
            EolError::ReserveGap
        );

        let space = TRANSFER_FEE_MINT_SPACE as u64;
        let lamports = Rent::get()?.minimum_balance(TRANSFER_FEE_MINT_SPACE);
        system_program::create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            lamports,
            space,
            ctx.accounts.token_program.key,
        )?;
        transfer_fee_initialize(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferFeeInitialize {
                    token_program_id: ctx.accounts.token_program.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            Some(&ctx.accounts.mint_authority.key()),
            Some(&ctx.accounts.mint_authority.key()),
            0,
            u64::MAX / 2,
        )?;
        initialize_mint2(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                InitializeMint2 {
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            params.decimals,
            &ctx.accounts.mint_authority.key(),
            None,
        )?;

        let sale_tokens = bps_tokens(params.total_supply, params.sale_bps);
        let lp_tokens = bps_tokens(params.total_supply, params.lp_bps);
        let team_tokens = bps_tokens(params.total_supply, params.team_bps);
        let g = coeff_g(MINT_PREMIUM_RATE_BPS, params.sh2_max_slippage_bps);
        let l = coeff_l(
            params.lp_usdc_share_bps as u64,
            params.lp_sol_share_bps as u64,
            params.sh2_max_slippage_bps,
        );
        let sale_pct = params.sale_bps as u128;
        let weighted = (params.lp_bps as u128) * l / math::BPS
            + (TREASURY_MIN_PCT as u128) * 100 * g / math::BPS;
        require!(
            weighted < sale_pct || (weighted == sale_pct && params.escrow_funding_need == 0),
            EolError::Infeasible
        );
        let min_raise = if params.escrow_funding_need == 0 {
            0
        } else {
            let denom = sale_pct.saturating_sub(weighted);
            require!(denom > 0, EolError::Infeasible);
            ((params.escrow_funding_need as u128) * sale_pct / denom) as u64
        };

        ctx.accounts.config.set_inner(Config {
            mint: ctx.accounts.mint.key(),
            factory: ctx.accounts.factory.key(),
            usdc_mint: ctx.accounts.usdc_mint.key(),
            ctoken_mint: ctx.accounts.ctoken_mint.key(),
            protocol_revenue_wallet: ctx.accounts.protocol_revenue_wallet.key(),
            mint_authority: ctx.accounts.mint_authority.key(),
            sale_usdc_vault: Pubkey::default(),
            sale_token_vault: Pubkey::default(),
            lp_token_vault: Pubkey::default(),
            team_token_vault: Pubkey::default(),
            treasury_usdc: Pubkey::default(),
            ctoken_treasury: ctx.accounts.ctoken_treasury.key(),
            fee_vault: Pubkey::default(),
            vesting: ctx.accounts.vesting.key(),
            staking: ctx.accounts.staking.key(),
            escrow: ctx.accounts.escrow.key(),
            decimals: params.decimals,
            status: STATUS_SALE,
            sale_price: params.sale_price,
            total_supply: params.total_supply,
            sale_tokens,
            lp_tokens_full: lp_tokens,
            team_tokens,
            sold_tokens: 0,
            raised_usdc: 0,
            sale_end: params.sale_end,
            escrow_need: params.escrow_funding_need,
            min_raise,
            sale_bps: params.sale_bps,
            lp_bps: params.lp_bps,
            lp_sol_share_bps: params.lp_sol_share_bps,
            lp_usdc_share_bps: params.lp_usdc_share_bps,
            sh2_max_slippage_bps: params.sh2_max_slippage_bps,
            mint_premium_bps: MINT_PREMIUM_RATE_BPS,
            convert_chunk: if params.convert_chunk == 0 {
                u64::MAX
            } else {
                params.convert_chunk
            },
            convert_done: false,
            shortfall_emitted: false,
            transfer_fee_bps: TRANSFER_FEE_DEFAULT_BPS,
            redemption_treasury_fee_bps: REDEMPTION_TREASURY_FEE_BPS,
            redemption_revenue_fee_bps: REDEMPTION_REVENUE_FEE_BPS,
            pending_protocol: 0,
            pending_protocol_underlying: 0,
            sol_residue: 0,
            escrow_usdc: 0,
            liquidated: false,
            trouble_gate: false,
            volume: u64::MAX,
            vote_yes: 0,
            vote_no: 0,
            vote_closes_at: 0,
            vote_denom: 0,
            vote_open: false,
            vote_executed: false,
            governed_mint_pct_bps: params.governed_mint_pct_bps,
            rm_activate_pct: params.reserve_mint_activate_pct,
            rm_deactivate_pct: params.reserve_mint_deactivate_pct,
            rm_duration_secs: params.reserve_mint_duration_secs,
            rm_below_since: 0,
            rm_allowance: 0,
            rm_allowance_open: false,
            rm_opened_at: 0,
            rm_price_snapshot: 0,
            rm_minted: 0,
            rm_gov_yes: 0,
            rm_gov_no: 0,
            rm_gov_closes_at: 0,
            rm_gov_open: false,
            liq_vote_window_secs: params.liq_vote_window_secs,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn init_vaults(ctx: Context<InitVaults>) -> Result<()> {
        require!(
            ctx.accounts.config.sale_usdc_vault == Pubkey::default(),
            EolError::VaultsReady
        );
        let cfg = &mut ctx.accounts.config;
        cfg.sale_usdc_vault = ctx.accounts.sale_usdc_vault.key();
        cfg.sale_token_vault = ctx.accounts.sale_token_vault.key();
        cfg.lp_token_vault = ctx.accounts.lp_token_vault.key();
        cfg.team_token_vault = ctx.accounts.team_token_vault.key();
        cfg.treasury_usdc = ctx.accounts.treasury_usdc.key();
        cfg.fee_vault = ctx.accounts.fee_vault.key();
        cfg.ctoken_treasury = ctx.accounts.ctoken_treasury.key();

        let mint_key = cfg.mint;
        let ma_bump = ctx.bumps.mint_authority;
        let seeds: &[&[u8]] = &[b"mint_authority", mint_key.as_ref(), &[ma_bump]];
        mint_into(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.sale_token_vault,
            &ctx.accounts.mint_authority,
            seeds,
            cfg.sale_tokens,
        )?;
        mint_into(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.lp_token_vault,
            &ctx.accounts.mint_authority,
            seeds,
            cfg.lp_tokens_full,
        )?;
        mint_into(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.team_token_vault,
            &ctx.accounts.mint_authority,
            seeds,
            cfg.team_tokens,
        )?;
        Ok(())
    }

    pub fn deposit(ctx: Context<DepositIx>, usdc_amount: u64) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_SALE, EolError::WrongStatus);
        require!(usdc_amount > 0, EolError::ZeroAmount);
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.config.sale_end,
            EolError::SaleClosed
        );
        let tokens = tokens_for_usdc(
            usdc_amount,
            ctx.accounts.config.sale_price,
            ctx.accounts.config.decimals,
        )
        .ok_or(EolError::Dust)?;
        let remaining = ctx
            .accounts
            .config
            .sale_tokens
            .saturating_sub(ctx.accounts.config.sold_tokens);
        require!(tokens <= remaining, EolError::Cap);
        let before = ctx.accounts.sale_usdc_vault.amount;
        token_interface_transfer(
            &ctx.accounts.usdc_program,
            &ctx.accounts.source,
            &ctx.accounts.sale_usdc_vault,
            &ctx.accounts.depositor,
            usdc_amount,
        )?;
        ctx.accounts.sale_usdc_vault.reload()?;
        let received = ctx.accounts.sale_usdc_vault.amount.saturating_sub(before);
        require!(received == usdc_amount, EolError::DepositMismatch);
        let rec = &mut ctx.accounts.deposit;
        rec.config = ctx.accounts.config.key();
        rec.depositor = ctx.accounts.depositor.key();
        rec.amount = rec.amount.saturating_add(received);
        rec.claimed = false;
        rec.bump = ctx.bumps.deposit;
        ctx.accounts.config.sold_tokens = ctx.accounts.config.sold_tokens.saturating_add(tokens);
        ctx.accounts.config.raised_usdc = ctx.accounts.config.raised_usdc.saturating_add(received);
        emit!(SaleDeposit {
            depositor: ctx.accounts.depositor.key(),
            usdc_amount: received,
            total_raised: ctx.accounts.config.raised_usdc,
        });
        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawIx>, usdc_amount: u64) -> Result<()> {
        require!(
            ctx.accounts.config.status == STATUS_SALE
                || ctx.accounts.config.status == STATUS_VOIDED,
            EolError::WrongStatus
        );
        require!(usdc_amount > 0, EolError::ZeroAmount);
        if ctx.accounts.config.status == STATUS_SALE {
            require!(
                Clock::get()?.unix_timestamp < ctx.accounts.config.sale_end,
                EolError::SaleClosed
            );
        }
        require!(ctx.accounts.deposit.amount >= usdc_amount, EolError::InsufficientCredit);
        let tokens = tokens_for_usdc(
            usdc_amount,
            ctx.accounts.config.sale_price,
            ctx.accounts.config.decimals,
        )
        .ok_or(EolError::Dust)?;
        ctx.accounts.deposit.amount = ctx.accounts.deposit.amount.saturating_sub(usdc_amount);
        if ctx.accounts.config.status == STATUS_SALE {
            ctx.accounts.config.sold_tokens =
                ctx.accounts.config.sold_tokens.saturating_sub(tokens);
            ctx.accounts.config.raised_usdc =
                ctx.accounts.config.raised_usdc.saturating_sub(usdc_amount);
        }
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        signed_transfer(
            &ctx.accounts.usdc_program,
            &ctx.accounts.sale_usdc_vault.to_account_info(),
            &ctx.accounts.destination.to_account_info(),
            &ctx.accounts.config.to_account_info(),
            usdc_amount,
            &mint,
            bump,
        )?;
        emit!(SaleWithdrawal {
            depositor: ctx.accounts.depositor.key(),
            amount: usdc_amount,
        });
        Ok(())
    }

    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_SALE, EolError::WrongStatus);
        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= ctx.accounts.config.sale_end
                || ctx.accounts.config.sold_tokens == ctx.accounts.config.sale_tokens,
            EolError::SaleOpen
        );
        let input = gate_from_config(&ctx.accounts.config);
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        let raised = ctx.accounts.config.raised_usdc;
        let min_raise = ctx.accounts.config.min_raise;
        let escrow_need = ctx.accounts.config.escrow_need;
        let escrow = ctx.accounts.config.escrow;
        let lp_usdc_share_bps = ctx.accounts.config.lp_usdc_share_bps;
        let sale_price = ctx.accounts.config.sale_price;
        let decimals = ctx.accounts.config.decimals;
        let sh2 = ctx.accounts.config.sh2_max_slippage_bps;
        let vesting = ctx.accounts.config.vesting;
        match eval_gates(input) {
            Err(fail) => {
                ctx.accounts.config.status = STATUS_VOIDED;
                emit!(SaleVoided {
                    raised,
                    minimum_required: min_raise,
                    reason: fail as u8,
                });
                Ok(())
            }
            Ok(p) => {
                let bump_seed = [bump];
                let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
                if escrow_need > 0 {
                    require!(!escrow.eq(&Pubkey::default()), EolError::NoEscrow);
                    transmuter_runway_escrow::cpi::fund(
                        CpiContext::new_with_signer(
                            ctx.accounts.escrow_program.to_account_info(),
                            transmuter_runway_escrow::cpi::accounts::Fund {
                                eol_token: ctx.accounts.config.to_account_info(),
                                config: ctx.accounts.escrow_config.to_account_info(),
                                vault: ctx.accounts.escrow_vault.to_account_info(),
                                source: ctx.accounts.sale_usdc_vault.to_account_info(),
                                token_program: ctx.accounts.usdc_program.to_account_info(),
                            },
                            &[seeds],
                        ),
                        escrow_need,
                    )?;
                    transmuter_runway_escrow::cpi::stamp_start_time(
                        CpiContext::new_with_signer(
                            ctx.accounts.escrow_program.to_account_info(),
                            transmuter_runway_escrow::cpi::accounts::StampStartTime {
                                eol_token: ctx.accounts.config.to_account_info(),
                                config: ctx.accounts.escrow_config.to_account_info(),
                            },
                            &[seeds],
                        ),
                        now,
                    )?;
                }
                let usdc_tokens =
                    ((p.lp_paired as u128) * (lp_usdc_share_bps as u128) / math::BPS) as u64;
                let usdc_cash = usdc_for_tokens(usdc_tokens, sale_price, decimals);
                if usdc_tokens > 0 && usdc_cash > 0 {
                    mock_dex::cpi::add_liquidity(
                        CpiContext::new_with_signer(
                            ctx.accounts.dex_program.to_account_info(),
                            AddLiquidity {
                                user: ctx.accounts.config.to_account_info(),
                                pool: ctx.accounts.pool_usdc.to_account_info(),
                                vault_a: ctx.accounts.pool_usdc_vault_a.to_account_info(),
                                vault_b: ctx.accounts.pool_usdc_vault_b.to_account_info(),
                                user_a: ctx.accounts.lp_token_vault.to_account_info(),
                                user_b: ctx.accounts.sale_usdc_vault.to_account_info(),
                                mint_a: ctx.accounts.mint.to_account_info(),
                                mint_b: ctx.accounts.usdc_mint.to_account_info(),
                                token_program_a: ctx.accounts.token_program.to_account_info(),
                                token_program_b: ctx.accounts.usdc_program.to_account_info(),
                            },
                            &[seeds],
                        ),
                        usdc_tokens,
                        usdc_cash,
                    )?;
                }
                let sol_tokens = p.lp_paired.saturating_sub(usdc_tokens);
                let sol_cash = usdc_for_tokens(sol_tokens, sale_price, decimals);
                let over = sol_cash.saturating_add(bps_of(sol_cash, sh2 as u16));
                if over > 0 {
                    let before = ctx.accounts.config.to_account_info().lamports();
                    mock_dex::cpi::swap_to_sol(
                        CpiContext::new_with_signer(
                            ctx.accounts.dex_program.to_account_info(),
                            SwapToSol {
                                user: ctx.accounts.config.to_account_info(),
                                pool: ctx.accounts.native_pool.to_account_info(),
                                vault_usdc: ctx.accounts.native_vault.to_account_info(),
                                user_usdc: ctx.accounts.sale_usdc_vault.to_account_info(),
                                sol_dest: ctx.accounts.config.to_account_info(),
                                token_program: ctx.accounts.usdc_program.to_account_info(),
                            },
                            &[seeds],
                        ),
                        over,
                        1,
                    )?;
                    ctx.accounts.config.sol_residue = ctx
                        .accounts
                        .config
                        .to_account_info()
                        .lamports()
                        .saturating_sub(before);
                }
                ctx.accounts.sale_usdc_vault.reload()?;
                let rest = ctx.accounts.sale_usdc_vault.amount;
                if rest > 0 {
                    signed_transfer(
                        &ctx.accounts.usdc_program,
                        &ctx.accounts.sale_usdc_vault.to_account_info(),
                        &ctx.accounts.treasury_usdc.to_account_info(),
                        &ctx.accounts.config.to_account_info(),
                        rest,
                        &mint,
                        bump,
                    )?;
                }
                if p.unsold_sale > 0 {
                    signed_burn(
                        &ctx.accounts.token_program,
                        &ctx.accounts.mint,
                        &ctx.accounts.sale_token_vault,
                        &ctx.accounts.config.to_account_info(),
                        p.unsold_sale,
                        &mint,
                        bump,
                    )?;
                }
                if p.unpaired_lp > 0 {
                    signed_burn(
                        &ctx.accounts.token_program,
                        &ctx.accounts.mint,
                        &ctx.accounts.lp_token_vault,
                        &ctx.accounts.config.to_account_info(),
                        p.unpaired_lp,
                        &mint,
                        bump,
                    )?;
                }
                if !vesting.eq(&Pubkey::default()) {
                    transmuter_vesting::cpi::stamp_start_time(
                        CpiContext::new_with_signer(
                            ctx.accounts.vesting_program.to_account_info(),
                            transmuter_vesting::cpi::accounts::StampStartTime {
                                eol_token: ctx.accounts.config.to_account_info(),
                                config: ctx.accounts.vesting_config.to_account_info(),
                            },
                            &[seeds],
                        ),
                        now,
                    )?;
                }
                let ma_bump = ctx.bumps.mint_authority;
                let ma_seeds: &[&[u8]] = &[b"mint_authority", mint.as_ref(), &[ma_bump]];
                transfer_fee_set(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        TransferFeeSetTransferFee {
                            token_program_id: ctx.accounts.token_program.to_account_info(),
                            mint: ctx.accounts.mint.to_account_info(),
                            authority: ctx.accounts.mint_authority.to_account_info(),
                        },
                        &[ma_seeds],
                    ),
                    TRANSFER_FEE_DEFAULT_BPS,
                    u64::MAX / 2,
                )?;
                ctx.accounts.config.status = STATUS_ACTIVE;
                if p.remainder < p.ask_need && !ctx.accounts.config.shortfall_emitted {
                    ctx.accounts.config.shortfall_emitted = true;
                    emit!(TreasuryShortfall {
                        realised_remainder: p.remainder,
                        ask_need: p.ask_need,
                    });
                }
                emit!(SaleFinalized {
                    raised,
                    treasury_portion: p.remainder,
                    lp_portion: p.lp_cash,
                    runway_portion: escrow_need,
                    unsold_burned: p.unsold_sale.saturating_add(p.unpaired_lp),
                });
                Ok(())
            }
        }
    }

    pub fn convert_treasury(ctx: Context<ConvertTreasury>, max_in: u64, min_out: u64) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        ctx.accounts.treasury_usdc.reload()?;
        let avail = ctx.accounts.treasury_usdc.amount;
        if avail == 0 && ctx.accounts.config.sol_residue == 0 {
            ctx.accounts.config.convert_done = true;
            return Ok(());
        }
        let chunk = max_in.min(avail).min(ctx.accounts.config.convert_chunk);
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
        let mut sol_in = ctx.accounts.config.sol_residue;
        ctx.accounts.config.sol_residue = 0;
        if chunk > 0 {
            let before = ctx.accounts.config.to_account_info().lamports();
            mock_dex::cpi::swap_to_sol(
                CpiContext::new_with_signer(
                    ctx.accounts.dex_program.to_account_info(),
                    SwapToSol {
                        user: ctx.accounts.config.to_account_info(),
                        pool: ctx.accounts.native_pool.to_account_info(),
                        vault_usdc: ctx.accounts.native_vault.to_account_info(),
                        user_usdc: ctx.accounts.treasury_usdc.to_account_info(),
                        sol_dest: ctx.accounts.config.to_account_info(),
                        token_program: ctx.accounts.usdc_program.to_account_info(),
                    },
                    &[seeds],
                ),
                chunk,
                min_out,
            )?;
            sol_in = sol_in.saturating_add(
                ctx.accounts
                    .config
                    .to_account_info()
                    .lamports()
                    .saturating_sub(before),
            );
        }
        if sol_in > 0 {
            credit_lamports(
                &ctx.accounts.config.to_account_info(),
                &ctx.accounts.ctoken_reserve.to_account_info(),
                sol_in,
            )?;
            transmuter_ctoken::cpi::mint_for_treasury(
                CpiContext::new_with_signer(
                    ctx.accounts.ctoken_program.to_account_info(),
                    CTokenMint {
                        authority: ctx.accounts.config.to_account_info(),
                        config: ctx.accounts.ctoken_config.to_account_info(),
                        reserve: ctx.accounts.ctoken_reserve.to_account_info(),
                        revenue_pot: ctx.accounts.ctoken_revenue.to_account_info(),
                        mint: ctx.accounts.ctoken_mint.to_account_info(),
                        mint_authority: ctx.accounts.ctoken_mint_authority.to_account_info(),
                        ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                        eol_record: ctx.accounts.eol_record.to_account_info(),
                        token_program: ctx.accounts.token_2022_ctoken.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                    },
                    &[seeds],
                ),
                sol_in,
            )?;
        }
        ctx.accounts.treasury_usdc.reload()?;
        if ctx.accounts.treasury_usdc.amount == 0 {
            ctx.accounts.config.convert_done = true;
            if let Some(p) = project(gate_from_config(&ctx.accounts.config)) {
                if p.remainder < p.ask_need && !ctx.accounts.config.shortfall_emitted {
                    ctx.accounts.config.shortfall_emitted = true;
                    emit!(TreasuryShortfall {
                        realised_remainder: p.remainder,
                        ask_need: p.ask_need,
                    });
                }
            }
        }
        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        require!(!ctx.accounts.deposit.claimed, EolError::AlreadyClaimed);
        require!(ctx.accounts.deposit.amount > 0, EolError::InsufficientCredit);
        let tokens = tokens_for_usdc(
            ctx.accounts.deposit.amount,
            ctx.accounts.config.sale_price,
            ctx.accounts.config.decimals,
        )
        .ok_or(EolError::Dust)?;
        ctx.accounts.deposit.claimed = true;
        ctx.accounts.deposit.amount = 0;
        signed_transfer_checked(
            &ctx.accounts.token_program,
            &ctx.accounts.sale_token_vault.to_account_info(),
            &ctx.accounts.destination.to_account_info(),
            &ctx.accounts.config.to_account_info(),
            &ctx.accounts.mint.to_account_info(),
            tokens,
            ctx.accounts.config.decimals,
            &ctx.accounts.config.mint,
            ctx.accounts.config.bump,
        )?;
        emit!(TokensClaimed {
            depositor: ctx.accounts.depositor.key(),
            amount: tokens,
        });
        Ok(())
    }

    pub fn redeem(ctx: Context<RedeemIx>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.config.status == STATUS_ACTIVE
                || ctx.accounts.config.status == STATUS_LIQUIDATING,
            EolError::WrongStatus
        );
        require!(amount > 0, EolError::ZeroAmount);
        let supply = ctx.accounts.mint.supply;
        require!(amount <= supply, EolError::Insufficient);
        let csol = token_amount(&ctx.accounts.ctoken_treasury.to_account_info())?;
        ctx.accounts.treasury_usdc.reload()?;
        let usdc = ctx
            .accounts
            .treasury_usdc
            .amount
            .saturating_add(ctx.accounts.config.escrow_usdc);
        let gross_csol = ((amount as u128) * (csol as u128) / (supply as u128)) as u64;
        let t_bps = ctx.accounts.config.redemption_treasury_fee_bps;
        let r_bps = ctx.accounts.config.redemption_revenue_fee_bps;
        let treasury_fee = bps_of(gross_csol, t_bps);
        let to_burn = gross_csol.saturating_sub(treasury_fee);
        let rec = &mut ctx.accounts.redeem_state;
        rec.owner = ctx.accounts.user.key();
        rec.config = ctx.accounts.config.key();
        rec.eol_burned = rec.eol_burned.saturating_add(amount);
        rec.csol_owed = rec.csol_owed.saturating_add(to_burn);
        rec.usdc_owed = rec
            .usdc_owed
            .saturating_add(((amount as u128) * (usdc as u128) / (supply as u128)) as u64);
        rec.bump = ctx.bumps.redeem_state;

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_eol.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
        let csol_pay = rec.csol_owed.saturating_sub(rec.csol_paid);
        let csol_now = token_amount(&ctx.accounts.ctoken_treasury.to_account_info())?;
        if csol_pay > 0 && csol_now >= csol_pay {
            let before = ctx.accounts.config.to_account_info().lamports();
            transmuter_ctoken::cpi::redeem(
                CpiContext::new_with_signer(
                    ctx.accounts.ctoken_program.to_account_info(),
                    CTokenRedeem {
                        authority: ctx.accounts.config.to_account_info(),
                        config: ctx.accounts.ctoken_config.to_account_info(),
                        reserve: ctx.accounts.ctoken_reserve.to_account_info(),
                        mint: ctx.accounts.ctoken_mint.to_account_info(),
                        mint_authority: ctx.accounts.ctoken_mint_authority.to_account_info(),
                        ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                        eol_record: ctx.accounts.eol_record.to_account_info(),
                        token_program: ctx.accounts.token_2022_ctoken.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                    },
                    &[seeds],
                ),
                csol_pay,
            )?;
            let released = ctx
                .accounts
                .config
                .to_account_info()
                .lamports()
                .saturating_sub(before);
            let skim = bps_of(released, r_bps);
            ctx.accounts.config.pending_protocol_underlying = ctx
                .accounts
                .config
                .pending_protocol_underlying
                .saturating_add(skim);
            let payout = released.saturating_sub(skim);
            if payout > 0 {
                **ctx.accounts.config.to_account_info().try_borrow_mut_lamports()? -= payout;
                **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
            }
            rec.csol_paid = rec.csol_paid.saturating_add(csol_pay);
            emit!(RedemptionCompleted {
                caller: ctx.accounts.user.key(),
                amount,
                gross: gross_csol,
                treasury_fee,
                revenue_skim: skim,
                burned: to_burn,
                payout,
            });
        }
        let usdc_pay = rec.usdc_owed.saturating_sub(rec.usdc_paid);
        ctx.accounts.treasury_usdc.reload()?;
        if usdc_pay > 0 && ctx.accounts.treasury_usdc.amount >= usdc_pay {
            signed_transfer(
                &ctx.accounts.usdc_program,
                &ctx.accounts.treasury_usdc.to_account_info(),
                &ctx.accounts.user_usdc.to_account_info(),
                &ctx.accounts.config.to_account_info(),
                usdc_pay,
                &mint,
                bump,
            )?;
            rec.usdc_paid = rec.usdc_paid.saturating_add(usdc_pay);
        }
        Ok(())
    }

    pub fn crank_volume(ctx: Context<AdminCfg>, volume: u64) -> Result<()> {
        ctx.accounts.config.volume = volume;
        Ok(())
    }

    pub fn open_trouble_gate(ctx: Context<AdminCfg>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        let mcap = usdc_for_tokens(
            ctx.accounts.config.total_supply.max(1),
            ctx.accounts.config.sale_price,
            ctx.accounts.config.decimals,
        );
        require!(ctx.accounts.config.volume.saturating_mul(100) < mcap, EolError::Healthy);
        ctx.accounts.config.trouble_gate = true;
        Ok(())
    }

    pub fn open_liquidation_vote(ctx: Context<OpenVote>) -> Result<()> {
        require!(ctx.accounts.config.trouble_gate, EolError::NoGate);
        require!(!ctx.accounts.config.vote_open, EolError::VoteOpen);
        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.config.vote_open = true;
        ctx.accounts.config.vote_closes_at =
            now.saturating_add(ctx.accounts.config.liq_vote_window_secs);
        ctx.accounts.config.vote_yes = 0;
        ctx.accounts.config.vote_no = 0;
        ctx.accounts.config.vote_denom = ctx.accounts.mint.supply;
        Ok(())
    }

    pub fn cast_liquidation_vote(ctx: Context<CastVote>, yes: bool, weight: u64) -> Result<()> {
        require!(ctx.accounts.config.vote_open, EolError::NoVote);
        require!(
            Clock::get()?.unix_timestamp < ctx.accounts.config.vote_closes_at,
            EolError::VoteClosed
        );
        require!(weight > 0, EolError::ZeroAmount);
        if yes {
            ctx.accounts.config.vote_yes = ctx.accounts.config.vote_yes.saturating_add(weight);
        } else {
            ctx.accounts.config.vote_no = ctx.accounts.config.vote_no.saturating_add(weight);
        }
        if !ctx.accounts.config.staking.eq(&Pubkey::default()) {
            let mint = ctx.accounts.config.mint;
            let bump = ctx.accounts.config.bump;
            transmuter_staking::cpi::set_voter_lock(
                CpiContext::new_with_signer(
                    ctx.accounts.staking_program.to_account_info(),
                    transmuter_staking::cpi::accounts::SetVoterLock {
                        eol_token: ctx.accounts.config.to_account_info(),
                        config: ctx.accounts.staking_config.to_account_info(),
                        stake_account: ctx.accounts.stake_account.to_account_info(),
                    },
                    &[&[b"config", mint.as_ref(), &[bump]]],
                ),
                ctx.accounts
                    .config
                    .vote_closes_at
                    .saturating_add(VOTER_LOCK_SECS),
            )?;
        }
        Ok(())
    }

    pub fn execute_liquidation(ctx: Context<ExecuteLiquidation>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        require!(ctx.accounts.config.vote_open, EolError::NoVote);
        require!(
            Clock::get()?.unix_timestamp >= ctx.accounts.config.vote_closes_at,
            EolError::VoteOpen
        );
        let cast = ctx.accounts.config.vote_yes.saturating_add(ctx.accounts.config.vote_no);
        require!(cast > 0, EolError::NoQuorum);
        let yes_bps = ((ctx.accounts.config.vote_yes as u128) * math::BPS / (cast as u128)) as u16;
        let q_bps = ((cast as u128) * math::BPS
            / (ctx.accounts.config.vote_denom.max(1) as u128)) as u16;
        require!(yes_bps >= LIQ_HOLDER_PASS_BPS, EolError::VoteFailed);
        require!(q_bps >= LIQ_HOLDER_QUORUM_BPS, EolError::NoQuorum);
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
        if !ctx.accounts.config.staking.eq(&Pubkey::default()) {
            transmuter_staking::cpi::notify_liquidation(CpiContext::new_with_signer(
                ctx.accounts.staking_program.to_account_info(),
                transmuter_staking::cpi::accounts::NotifyLiquidation {
                    eol_token: ctx.accounts.config.to_account_info(),
                    config: ctx.accounts.staking_config.to_account_info(),
                },
                &[seeds],
            ))?;
        }
        if !ctx.accounts.config.vesting.eq(&Pubkey::default()) {
            transmuter_vesting::cpi::notify_liquidation(CpiContext::new_with_signer(
                ctx.accounts.vesting_program.to_account_info(),
                transmuter_vesting::cpi::accounts::NotifyLiquidation {
                    eol_token: ctx.accounts.config.to_account_info(),
                    config: ctx.accounts.vesting_config.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    team_pot: ctx.accounts.team_pot.to_account_info(),
                    team_entry: ctx.accounts.team_entry.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                &[seeds],
            ))?;
        }
        if !ctx.accounts.config.escrow.eq(&Pubkey::default()) {
            transmuter_runway_escrow::cpi::notify_liquidation(CpiContext::new_with_signer(
                ctx.accounts.escrow_program.to_account_info(),
                transmuter_runway_escrow::cpi::accounts::NotifyLiquidation {
                    eol_token: ctx.accounts.config.to_account_info(),
                    config: ctx.accounts.escrow_config.to_account_info(),
                    vault: ctx.accounts.escrow_vault.to_account_info(),
                    eol_treasury: ctx.accounts.treasury_usdc.to_account_info(),
                    token_program: ctx.accounts.usdc_program.to_account_info(),
                },
                &[seeds],
            ))?;
            ctx.accounts.treasury_usdc.reload()?;
            ctx.accounts.config.escrow_usdc = ctx.accounts.treasury_usdc.amount;
        }
        let fee = bps_of(
            token_amount(&ctx.accounts.ctoken_treasury.to_account_info())?,
            LIQUIDATION_FEE_BPS,
        );
        if fee > 0 {
            let before = ctx.accounts.config.to_account_info().lamports();
            transmuter_ctoken::cpi::redeem(
                CpiContext::new_with_signer(
                    ctx.accounts.ctoken_program.to_account_info(),
                    CTokenRedeem {
                        authority: ctx.accounts.config.to_account_info(),
                        config: ctx.accounts.ctoken_config.to_account_info(),
                        reserve: ctx.accounts.ctoken_reserve.to_account_info(),
                        mint: ctx.accounts.ctoken_mint.to_account_info(),
                        mint_authority: ctx.accounts.ctoken_mint_authority.to_account_info(),
                        ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                        eol_record: ctx.accounts.eol_record.to_account_info(),
                        token_program: ctx.accounts.token_2022_ctoken.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                    },
                    &[seeds],
                ),
                fee,
            )?;
            let released = ctx
                .accounts
                .config
                .to_account_info()
                .lamports()
                .saturating_sub(before);
            let proto = ((released as u128) * (LIQUIDATION_FEE_PROTOCOL_BPS as u128)
                / (LIQUIDATION_FEE_BPS as u128)) as u64;
            if proto > 0 {
                **ctx.accounts.config.to_account_info().try_borrow_mut_lamports()? -= proto;
                **ctx
                    .accounts
                    .protocol_revenue_wallet
                    .to_account_info()
                    .try_borrow_mut_lamports()? += proto;
            }
            let keep = released.saturating_sub(proto);
            if keep > 0 {
                **ctx.accounts.config.to_account_info().try_borrow_mut_lamports()? -= keep;
                **ctx
                    .accounts
                    .ctoken_reserve
                    .to_account_info()
                    .try_borrow_mut_lamports()? += keep;
            }
        }
        ctx.accounts.config.redemption_treasury_fee_bps = 0;
        ctx.accounts.config.redemption_revenue_fee_bps = 0;
        ctx.accounts.config.status = STATUS_LIQUIDATING;
        ctx.accounts.config.liquidated = true;
        ctx.accounts.config.vote_executed = true;
        ctx.accounts.config.rm_allowance_open = false;
        Ok(())
    }

    pub fn crank_reserve(ctx: Context<AdminCfg>, backing_pct: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        if backing_pct < ctx.accounts.config.rm_activate_pct {
            if ctx.accounts.config.rm_below_since == 0 {
                ctx.accounts.config.rm_below_since = now;
            }
        } else {
            ctx.accounts.config.rm_below_since = 0;
        }
        if ctx.accounts.config.rm_allowance_open
            && backing_pct >= ctx.accounts.config.rm_deactivate_pct
        {
            ctx.accounts.config.rm_allowance_open = false;
        }
        Ok(())
    }

    pub fn open_reserve_auto(ctx: Context<AdminCfg>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        require!(!ctx.accounts.config.rm_allowance_open, EolError::AllowanceOpen);
        require!(ctx.accounts.config.rm_below_since != 0, EolError::NoTrigger);
        let now = Clock::get()?.unix_timestamp;
        require!(
            now.saturating_sub(ctx.accounts.config.rm_below_since)
                >= ctx.accounts.config.rm_duration_secs,
            EolError::Duration
        );
        ctx.accounts.config.rm_allowance_open = true;
        ctx.accounts.config.rm_allowance =
            bps_of(ctx.accounts.mint.supply, RESERVE_MINT_AUTO_ALLOWANCE_BPS);
        ctx.accounts.config.rm_opened_at = now;
        ctx.accounts.config.rm_minted = 0;
        ctx.accounts.config.rm_price_snapshot = ctx.accounts.config.sale_price;
        Ok(())
    }

    pub fn open_reserve_gov(ctx: Context<AdminCfg>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EolError::WrongStatus);
        require!(!ctx.accounts.config.rm_gov_open, EolError::VoteOpen);
        ctx.accounts.config.rm_gov_open = true;
        ctx.accounts.config.rm_gov_yes = 0;
        ctx.accounts.config.rm_gov_no = 0;
        ctx.accounts.config.rm_gov_closes_at = Clock::get()?.unix_timestamp.saturating_add(1);
        Ok(())
    }

    pub fn cast_reserve_gov(ctx: Context<AdminCfg>, yes: bool, weight: u64) -> Result<()> {
        require!(ctx.accounts.config.rm_gov_open, EolError::NoVote);
        if yes {
            ctx.accounts.config.rm_gov_yes = ctx.accounts.config.rm_gov_yes.saturating_add(weight);
        } else {
            ctx.accounts.config.rm_gov_no = ctx.accounts.config.rm_gov_no.saturating_add(weight);
        }
        Ok(())
    }

    pub fn execute_reserve_gov(ctx: Context<AdminCfg>) -> Result<()> {
        require!(ctx.accounts.config.rm_gov_open, EolError::NoVote);
        require!(
            Clock::get()?.unix_timestamp >= ctx.accounts.config.rm_gov_closes_at,
            EolError::VoteOpen
        );
        let cast = ctx.accounts.config.rm_gov_yes.saturating_add(ctx.accounts.config.rm_gov_no);
        require!(cast > 0, EolError::NoQuorum);
        let yes_bps = ((ctx.accounts.config.rm_gov_yes as u128) * math::BPS / (cast as u128)) as u16;
        require!(yes_bps >= 5_500, EolError::VoteFailed);
        require!(!ctx.accounts.config.rm_allowance_open, EolError::AllowanceOpen);
        ctx.accounts.config.rm_gov_open = false;
        ctx.accounts.config.rm_allowance_open = true;
        ctx.accounts.config.rm_allowance = bps_of(
            ctx.accounts.mint.supply,
            ctx.accounts.config.governed_mint_pct_bps,
        );
        ctx.accounts.config.rm_opened_at = Clock::get()?.unix_timestamp;
        ctx.accounts.config.rm_minted = 0;
        ctx.accounts.config.rm_price_snapshot = ctx.accounts.config.sale_price;
        Ok(())
    }

    pub fn reserve_mint(ctx: Context<ReserveMintIx>, lamports: u64) -> Result<()> {
        require!(ctx.accounts.config.rm_allowance_open, EolError::NoAllowance);
        require!(lamports > 0, EolError::ZeroAmount);
        let elapsed = Clock::get()?
            .unix_timestamp
            .saturating_sub(ctx.accounts.config.rm_opened_at);
        let steps = (elapsed / RESERVE_MINT_PREMIUM_DECAY_INTERVAL_SECS) as u64;
        let decay = steps.saturating_mul(RESERVE_MINT_PREMIUM_DECAY_BPS as u64);
        let premium = (RESERVE_MINT_PREMIUM_OPEN_BPS as u64)
            .saturating_sub(decay)
            .max(RESERVE_MINT_PREMIUM_MIN_BPS as u64);
        let px = ctx
            .accounts
            .config
            .rm_price_snapshot
            .max(ctx.accounts.config.sale_price);
        let mint_price = px.saturating_add(bps_of(px, premium as u16));
        let proto = bps_of(lamports, RESERVE_MINT_PROTOCOL_FEE_BPS);
        let to_treasury = lamports.saturating_sub(proto);
        require!(to_treasury > 0, EolError::Dust);
        let tokens = tokens_for_usdc(to_treasury, mint_price, ctx.accounts.config.decimals)
            .ok_or(EolError::Dust)?;
        let remaining = ctx
            .accounts
            .config
            .rm_allowance
            .saturating_sub(ctx.accounts.config.rm_minted);
        let tokens = tokens.min(remaining);
        require!(tokens > 0, EolError::Dust);
        require!(
            ctx.accounts.user.to_account_info().lamports() >= lamports,
            EolError::Insufficient
        );
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.config.to_account_info(),
                },
            ),
            lamports,
        )?;
        credit_lamports(
            &ctx.accounts.config.to_account_info(),
            &ctx.accounts.ctoken_reserve.to_account_info(),
            to_treasury,
        )?;
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        transmuter_ctoken::cpi::mint_for_treasury(
            CpiContext::new_with_signer(
                ctx.accounts.ctoken_program.to_account_info(),
                CTokenMint {
                    authority: ctx.accounts.config.to_account_info(),
                    config: ctx.accounts.ctoken_config.to_account_info(),
                    reserve: ctx.accounts.ctoken_reserve.to_account_info(),
                    revenue_pot: ctx.accounts.ctoken_revenue.to_account_info(),
                    mint: ctx.accounts.ctoken_mint.to_account_info(),
                    mint_authority: ctx.accounts.ctoken_mint_authority.to_account_info(),
                    ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                    eol_record: ctx.accounts.eol_record.to_account_info(),
                    token_program: ctx.accounts.token_2022_ctoken.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[&[b"config", mint.as_ref(), &[bump]]],
            ),
            to_treasury,
        )?;
        if proto > 0 {
            **ctx.accounts.config.to_account_info().try_borrow_mut_lamports()? -= proto;
            **ctx
                .accounts
                .protocol_revenue_wallet
                .to_account_info()
                .try_borrow_mut_lamports()? += proto;
        }
        let ma_bump = ctx.bumps.mint_authority;
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_eol.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[&[b"mint_authority", mint.as_ref(), &[ma_bump]]],
            ),
            tokens,
        )?;
        ctx.accounts.config.rm_minted = ctx.accounts.config.rm_minted.saturating_add(tokens);
        if ctx.accounts.config.rm_minted >= ctx.accounts.config.rm_allowance {
            ctx.accounts.config.rm_allowance_open = false;
        }
        Ok(())
    }

    pub fn accrue_protocol_fees(ctx: Context<AccrueFees>, amount: u64) -> Result<()> {
        require!(amount > 0, EolError::ZeroAmount);
        let before = ctx.accounts.fee_vault.amount;
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.source.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;
        ctx.accounts.fee_vault.reload()?;
        let received = ctx.accounts.fee_vault.amount.saturating_sub(before);
        ctx.accounts.config.pending_protocol =
            ctx.accounts.config.pending_protocol.saturating_add(received);
        Ok(())
    }

    pub fn settle_protocol(ctx: Context<SettleProtocol>) -> Result<()> {
        let amt = ctx.accounts.config.pending_protocol;
        if amt == 0 {
            return Ok(());
        }
        ctx.accounts.config.pending_protocol = 0;
        signed_transfer_checked(
            &ctx.accounts.token_program,
            &ctx.accounts.fee_vault.to_account_info(),
            &ctx.accounts.protocol_eol.to_account_info(),
            &ctx.accounts.config.to_account_info(),
            &ctx.accounts.mint.to_account_info(),
            amt,
            ctx.accounts.mint.decimals,
            &ctx.accounts.config.mint,
            ctx.accounts.config.bump,
        )
    }
}

fn bps_tokens(supply: u64, bps: u16) -> u64 {
    ((supply as u128) * (bps as u128) / math::BPS) as u64
}

fn token_amount(account: &AccountInfo) -> Result<u64> {
    let data = account.try_borrow_data()?;
    require!(data.len() >= 72, EolError::Insufficient);
    Ok(u64::from_le_bytes(data[64..72].try_into().unwrap()))
}

fn credit_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let rent = Rent::get()?.minimum_balance(from.data_len());
    require!(
        from.lamports().saturating_sub(rent) >= amount,
        EolError::Insufficient
    );
    **from.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}

fn gate_from_config(cfg: &Config) -> GateInput {
    GateInput {
        total_supply: cfg.total_supply,
        sale_tokens: cfg.sale_tokens,
        sold_tokens: cfg.sold_tokens,
        lp_tokens_full: cfg.lp_tokens_full,
        sale_price: cfg.sale_price,
        decimals: cfg.decimals,
        raised: cfg.raised_usdc,
        min_raise: cfg.min_raise,
        escrow_need: cfg.escrow_need,
        lp_usdc_share_bps: cfg.lp_usdc_share_bps as u64,
        lp_sol_share_bps: cfg.lp_sol_share_bps as u64,
        slippage_bps: cfg.sh2_max_slippage_bps,
        mint_premium_bps: cfg.mint_premium_bps,
    }
}

fn mint_into<'info>(
    token_program: &Program<'info, Token2022>,
    mint: &InterfaceAccount<'info, Mint>,
    vault: &InterfaceAccount<'info, TokenAccount>,
    authority: &UncheckedAccount<'info>,
    seeds: &[&[u8]],
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    mint_to(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            MintTo {
                mint: mint.to_account_info(),
                to: vault.to_account_info(),
                authority: authority.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )
}

fn token_interface_transfer<'info>(
    program: &Interface<'info, TokenInterface>,
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    anchor_spl::token_interface::transfer(
        CpiContext::new(
            program.to_account_info(),
            Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
        ),
        amount,
    )
}

fn signed_transfer<'info>(
    program: &Interface<'info, TokenInterface>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    amount: u64,
    mint: &Pubkey,
    bump: u8,
) -> Result<()> {
    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
    anchor_spl::token_interface::transfer(
        CpiContext::new_with_signer(
            program.to_account_info(),
            Transfer {
                from: from.clone(),
                to: to.clone(),
                authority: authority.clone(),
            },
            &[seeds],
        ),
        amount,
    )
}

fn signed_transfer_checked<'info>(
    program: &Interface<'info, TokenInterface>,
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    mint_ai: &AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    mint: &Pubkey,
    bump: u8,
) -> Result<()> {
    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
    anchor_spl::token_interface::transfer_checked(
        CpiContext::new_with_signer(
            program.to_account_info(),
            TransferChecked {
                from: from.clone(),
                mint: mint_ai.clone(),
                to: to.clone(),
                authority: authority.clone(),
            },
            &[seeds],
        ),
        amount,
        decimals,
    )
}

fn signed_burn<'info>(
    program: &Program<'info, Token2022>,
    mint: &InterfaceAccount<'info, Mint>,
    from: &InterfaceAccount<'info, TokenAccount>,
    authority: &AccountInfo<'info>,
    amount: u64,
    mint_key: &Pubkey,
    bump: u8,
) -> Result<()> {
    let bump_seed = [bump];
    let seeds: &[&[u8]] = &[b"config", mint_key.as_ref(), &bump_seed];
    burn(
        CpiContext::new_with_signer(
            program.to_account_info(),
            Burn {
                mint: mint.to_account_info(),
                from: from.to_account_info(),
                authority: authority.clone(),
            },
            &[seeds],
        ),
        amount,
    )
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: PDA mint authority.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Box<Account<'info, Config>>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: backing cToken mint.
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK: factory registrar.
    pub factory: UncheckedAccount<'info>,
    /// CHECK: protocol revenue.
    pub protocol_revenue_wallet: UncheckedAccount<'info>,
    /// CHECK: optional vesting.
    pub vesting: UncheckedAccount<'info>,
    /// CHECK: optional staking.
    pub staking: UncheckedAccount<'info>,
    /// CHECK: optional escrow.
    pub escrow: UncheckedAccount<'info>,
    /// CHECK: ATA of config for the cToken, created by the client.
    pub ctoken_treasury: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitVaults<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: PDA mint authority.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = config,
        token::token_program = usdc_program
    )]
    pub sale_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = config,
        token::token_program = token_program
    )]
    pub sale_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = config,
        token::token_program = token_program
    )]
    pub lp_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = config,
        token::token_program = token_program
    )]
    pub team_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = config,
        token::token_program = usdc_program
    )]
    pub treasury_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = config,
        token::token_program = token_program
    )]
    pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: ATA of config.
    pub ctoken_treasury: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositIx<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, address = config.sale_usdc_vault)]
    pub sale_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub source: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + Deposit::INIT_SPACE,
        seeds = [b"deposit", config.key().as_ref(), depositor.key().as_ref()],
        bump
    )]
    pub deposit: Box<Account<'info, Deposit>>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawIx<'info> {
    pub depositor: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, address = config.sale_usdc_vault)]
    pub sale_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub destination: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"deposit", config.key().as_ref(), depositor.key().as_ref()],
        bump = deposit.bump,
        has_one = depositor
    )]
    pub deposit: Box<Account<'info, Deposit>>,
    pub usdc_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: mint authority PDA.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(mut, address = config.sale_usdc_vault)]
    pub sale_usdc_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, address = config.sale_token_vault)]
    pub sale_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, address = config.lp_token_vault)]
    pub lp_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, address = config.treasury_usdc)]
    pub treasury_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: mock dex program.
    pub dex_program: UncheckedAccount<'info>,
    /// CHECK:
    pub pool_usdc: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub pool_usdc_vault_a: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub pool_usdc_vault_b: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub native_pool: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub native_vault: UncheckedAccount<'info>,
    /// CHECK:
    pub escrow_program: UncheckedAccount<'info>,
    /// CHECK:
    pub escrow_config: UncheckedAccount<'info>,
    /// CHECK:
    pub escrow_vault: UncheckedAccount<'info>,
    /// CHECK:
    pub vesting_program: UncheckedAccount<'info>,
    /// CHECK:
    pub vesting_config: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub usdc_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ConvertTreasury<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, address = config.treasury_usdc)]
    pub treasury_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK:
    pub dex_program: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub native_pool: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub native_vault: UncheckedAccount<'info>,
    pub ctoken_program: Program<'info, TransmuterCtoken>,
    /// CHECK:
    pub ctoken_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_reserve: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_revenue: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK:
    pub ctoken_mint_authority: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_treasury: UncheckedAccount<'info>,
    /// CHECK:
    pub eol_record: UncheckedAccount<'info>,
    /// CHECK:
    pub token_2022_ctoken: UncheckedAccount<'info>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    pub depositor: Signer<'info>,
    #[account(seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, address = config.sale_token_vault)]
    pub sale_token_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub destination: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        seeds = [b"deposit", config.key().as_ref(), depositor.key().as_ref()],
        bump = deposit.bump,
        has_one = depositor
    )]
    pub deposit: Box<Account<'info, Deposit>>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RedeemIx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub user_eol: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, address = config.treasury_usdc)]
    pub treasury_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub user_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + RedeemState::INIT_SPACE,
        seeds = [b"redeem", config.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub redeem_state: Box<Account<'info, RedeemState>>,
    pub ctoken_program: Program<'info, TransmuterCtoken>,
    /// CHECK:
    pub ctoken_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_reserve: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK:
    pub ctoken_mint_authority: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_treasury: UncheckedAccount<'info>,
    /// CHECK:
    pub eol_record: UncheckedAccount<'info>,
    /// CHECK:
    pub token_2022_ctoken: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminCfg<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
}

#[derive(Accounts)]
pub struct OpenVote<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    pub voter: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    /// CHECK:
    pub staking_program: UncheckedAccount<'info>,
    /// CHECK:
    pub staking_config: UncheckedAccount<'info>,
    /// CHECK:
    pub stake_account: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteLiquidation<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, address = config.treasury_usdc)]
    pub treasury_usdc: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK:
    #[account(mut)]
    pub protocol_revenue_wallet: UncheckedAccount<'info>,
    /// CHECK:
    pub staking_program: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub staking_config: UncheckedAccount<'info>,
    /// CHECK:
    pub vesting_program: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub vesting_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub team_pot: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub team_entry: UncheckedAccount<'info>,
    /// CHECK:
    pub escrow_program: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub escrow_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub escrow_vault: UncheckedAccount<'info>,
    pub ctoken_program: Program<'info, TransmuterCtoken>,
    /// CHECK:
    pub ctoken_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_reserve: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK:
    pub ctoken_mint_authority: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_treasury: UncheckedAccount<'info>,
    /// CHECK:
    pub eol_record: UncheckedAccount<'info>,
    /// CHECK:
    pub token_2022_ctoken: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReserveMintIx<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_eol: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK:
    #[account(mut)]
    pub protocol_revenue_wallet: UncheckedAccount<'info>,
    pub ctoken_program: Program<'info, TransmuterCtoken>,
    /// CHECK:
    pub ctoken_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_reserve: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_revenue: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK:
    pub ctoken_mint_authority: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub ctoken_treasury: UncheckedAccount<'info>,
    /// CHECK:
    pub eol_record: UncheckedAccount<'info>,
    /// CHECK:
    pub token_2022_ctoken: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccrueFees<'info> {
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub source: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, address = config.fee_vault)]
    pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SettleProtocol<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"config", config.mint.as_ref()], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, address = config.fee_vault)]
    pub fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub protocol_eol: Box<InterfaceAccount<'info, TokenAccount>>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub mint: Pubkey,
    pub factory: Pubkey,
    pub usdc_mint: Pubkey,
    pub ctoken_mint: Pubkey,
    pub protocol_revenue_wallet: Pubkey,
    pub mint_authority: Pubkey,
    pub sale_usdc_vault: Pubkey,
    pub sale_token_vault: Pubkey,
    pub lp_token_vault: Pubkey,
    pub team_token_vault: Pubkey,
    pub treasury_usdc: Pubkey,
    pub ctoken_treasury: Pubkey,
    pub fee_vault: Pubkey,
    pub vesting: Pubkey,
    pub staking: Pubkey,
    pub escrow: Pubkey,
    pub decimals: u8,
    pub status: u8,
    pub sale_price: u64,
    pub total_supply: u64,
    pub sale_tokens: u64,
    pub lp_tokens_full: u64,
    pub team_tokens: u64,
    pub sold_tokens: u64,
    pub raised_usdc: u64,
    pub sale_end: i64,
    pub escrow_need: u64,
    pub min_raise: u64,
    pub sale_bps: u16,
    pub lp_bps: u16,
    pub lp_sol_share_bps: u16,
    pub lp_usdc_share_bps: u16,
    pub sh2_max_slippage_bps: u64,
    pub mint_premium_bps: u64,
    pub convert_chunk: u64,
    pub convert_done: bool,
    pub shortfall_emitted: bool,
    pub transfer_fee_bps: u16,
    pub redemption_treasury_fee_bps: u16,
    pub redemption_revenue_fee_bps: u16,
    pub pending_protocol: u64,
    pub pending_protocol_underlying: u64,
    pub sol_residue: u64,
    pub escrow_usdc: u64,
    pub liquidated: bool,
    pub trouble_gate: bool,
    pub volume: u64,
    pub vote_yes: u64,
    pub vote_no: u64,
    pub vote_closes_at: i64,
    pub vote_denom: u64,
    pub vote_open: bool,
    pub vote_executed: bool,
    pub governed_mint_pct_bps: u16,
    pub rm_activate_pct: u64,
    pub rm_deactivate_pct: u64,
    pub rm_duration_secs: i64,
    pub rm_below_since: i64,
    pub rm_allowance: u64,
    pub rm_allowance_open: bool,
    pub rm_opened_at: i64,
    pub rm_price_snapshot: u64,
    pub rm_minted: u64,
    pub rm_gov_yes: u64,
    pub rm_gov_no: u64,
    pub rm_gov_closes_at: i64,
    pub rm_gov_open: bool,
    pub liq_vote_window_secs: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Deposit {
    pub config: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RedeemState {
    pub config: Pubkey,
    pub owner: Pubkey,
    pub eol_burned: u64,
    pub csol_owed: u64,
    pub csol_paid: u64,
    pub usdc_owed: u64,
    pub usdc_paid: u64,
    pub bump: u8,
}

#[event]
pub struct SaleDeposit {
    pub depositor: Pubkey,
    pub usdc_amount: u64,
    pub total_raised: u64,
}
#[event]
pub struct SaleWithdrawal {
    pub depositor: Pubkey,
    pub amount: u64,
}
#[event]
pub struct SaleFinalized {
    pub raised: u64,
    pub treasury_portion: u64,
    pub lp_portion: u64,
    pub runway_portion: u64,
    pub unsold_burned: u64,
}
#[event]
pub struct SaleVoided {
    pub raised: u64,
    pub minimum_required: u64,
    pub reason: u8,
}
#[event]
pub struct TokensClaimed {
    pub depositor: Pubkey,
    pub amount: u64,
}
#[event]
pub struct TreasuryShortfall {
    pub realised_remainder: u64,
    pub ask_need: u64,
}
#[event]
pub struct RedemptionCompleted {
    pub caller: Pubkey,
    pub amount: u64,
    pub gross: u64,
    pub treasury_fee: u64,
    pub revenue_skim: u64,
    pub burned: u64,
    pub payout: u64,
}

#[error_code]
pub enum EolError {
    #[msg("launch params invalid")]
    BadParams,
    #[msg("public sale below 25%")]
    SalePct,
    #[msg("LP below 10%")]
    LpPct,
    #[msg("team above 20%")]
    TeamPct,
    #[msg("dao airdrop above 10%")]
    DaoPct,
    #[msg("LP split must sum to 100% and stay in [25%, 75%]")]
    LpSplit,
    #[msg("allocations must sum to 100%")]
    AllocSum,
    #[msg("governed mint pct out of [5%, 15%]")]
    ReservePct,
    #[msg("reserve mint deactivate must sit >= 10 points above activate")]
    ReserveGap,
    #[msg("lpPct*L + treasuryMinPct*g makes this launch infeasible")]
    Infeasible,
    #[msg("wrong lifecycle status")]
    WrongStatus,
    #[msg("amount must be positive")]
    ZeroAmount,
    #[msg("sale window has closed")]
    SaleClosed,
    #[msg("sale is still open")]
    SaleOpen,
    #[msg("deposit exceeds remaining sale cap")]
    Cap,
    #[msg("credited tokens would be zero")]
    Dust,
    #[msg("USDC received did not match amount")]
    DepositMismatch,
    #[msg("insufficient deposit credit")]
    InsufficientCredit,
    #[msg("escrow config required when escrowFundingNeed > 0")]
    NoEscrow,
    #[msg("already claimed")]
    AlreadyClaimed,
    #[msg("insufficient treasury")]
    Insufficient,
    #[msg("volume is not in the trouble band")]
    Healthy,
    #[msg("trouble gate is closed")]
    NoGate,
    #[msg("vote already open")]
    VoteOpen,
    #[msg("no open vote")]
    NoVote,
    #[msg("vote window closed")]
    VoteClosed,
    #[msg("quorum not met")]
    NoQuorum,
    #[msg("holder vote failed")]
    VoteFailed,
    #[msg("allowance already open")]
    AllowanceOpen,
    #[msg("automatic trigger has not armed")]
    NoTrigger,
    #[msg("duration has not elapsed")]
    Duration,
    #[msg("no reserve-mint allowance")]
    NoAllowance,
    #[msg("vaults already initialised")]
    VaultsReady,
}
