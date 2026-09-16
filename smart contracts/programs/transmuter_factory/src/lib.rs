use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::token::Token;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use mock_dex::program::MockDex;
use transmuter_constants::*;
use transmuter_ctoken::program::TransmuterCtoken;
use transmuter_eol_token::program::TransmuterEolToken;
use transmuter_eol_token::LaunchParams as EolParams;
use transmuter_runway_escrow::program::TransmuterRunwayEscrow;
use transmuter_staking::program::TransmuterStaking;
use transmuter_vesting::program::TransmuterVesting;

pub mod math;
use math::{bps_tokens, feasibility, fixed_target_raise, Feasibility};

declare_id!("5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV");

pub const STATUS_CREATED: u8 = 0;
pub const STATUS_WIRED: u8 = 1;
pub const STATUS_SALE: u8 = 2;
pub const STATUS_ACTIVE: u8 = 3;
pub const STATUS_VOIDED: u8 = 4;

pub const WIRE_EOL: u16 = 1 << 0;
pub const WIRE_STAKING: u16 = 1 << 1;
pub const WIRE_VESTING: u16 = 1 << 2;
pub const WIRE_ESCROW: u16 = 1 << 3;
pub const WIRE_REGISTER: u16 = 1 << 4;
pub const WIRE_POOL_USDC: u16 = 1 << 5;
pub const WIRE_POOL_SOL: u16 = 1 << 6;
pub const WIRE_VAULTS: u16 = 1 << 7;
pub const WIRE_DAO: u16 = 1 << 8;

const FACTORY_RENT_BUFFER: u64 = 5_000_000_000;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateLaunchParams {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub sale_type: u8,
    pub sale_price: u64,
    pub target_raise: u64,
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
    pub governed_mint_pct_bps: u16,
    pub reserve_mint_activate_pct: u64,
    pub reserve_mint_deactivate_pct: u64,
    pub reserve_mint_duration_secs: i64,
    pub reserve_mint_vote_window_secs: i64,
    pub liq_vote_window_secs: i64,
    pub convert_chunk: u64,
    pub transfer_fee_bps: u16,
    pub fee_lp_bps: u16,
    pub fee_treasury_bps: u16,
    pub fee_ctoken_bps: u16,
    pub fee_protocol_bps: u16,
    pub fee_creator_bps: u16,
    pub fee_burn_bps: u16,
    pub forfeit_dest: u8,
    pub vesting_schedule: u8,
}

#[program]
pub mod transmuter_factory {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.factory.set_inner(FactoryConfig {
            authority: ctx.accounts.payer.key(),
            protocol_revenue_wallet: ctx.accounts.protocol_revenue_wallet.key(),
            usdc_mint: ctx.accounts.usdc_mint.key(),
            registry: ctx.accounts.registry.key(),
            dao: ctx.accounts.dao.key(),
            mint_premium_bps: MINT_PREMIUM_RATE_BPS,
            sh2_max_slippage_bps: SH2_MAX_SLIPPAGE_BPS,
            total_launches: 0,
            bump: ctx.bumps.factory,
        });
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.factory.to_account_info(),
                },
            ),
            FACTORY_RENT_BUFFER,
        )?;
        Ok(())
    }

    pub fn set_protocol_params(
        ctx: Context<Admin>,
        sh2_max_slippage_bps: u64,
        mint_premium_bps: u64,
    ) -> Result<()> {
        ctx.accounts.factory.sh2_max_slippage_bps = sh2_max_slippage_bps;
        ctx.accounts.factory.mint_premium_bps = mint_premium_bps;
        Ok(())
    }

    pub fn add_ctoken(ctx: Context<AddCtoken>) -> Result<()> {
        ctx.accounts.listing.set_inner(CTokenListing {
            mint: ctx.accounts.mint.key(),
            bump: ctx.bumps.listing,
        });
        Ok(())
    }

    pub fn add_investor(ctx: Context<AddInvestor>) -> Result<()> {
        ctx.accounts.listing.set_inner(InvestorListing {
            wallet: ctx.accounts.wallet.key(),
            bump: ctx.bumps.listing,
        });
        Ok(())
    }

    pub fn create_launch(
        ctx: Context<CreateLaunch>,
        launch_id: u64,
        params: CreateLaunchParams,
    ) -> Result<()> {
        require!(
            launch_id == ctx.accounts.factory.total_launches,
            FactoryError::LaunchId
        );
        validate_params(&params, &ctx.accounts.factory)?;
        require_keys_neq!(
            ctx.accounts.backing_ctoken.key(),
            ctx.accounts.fallback_ctoken.key(),
            FactoryError::FallbackSame
        );
        require_keys_eq!(
            ctx.accounts.backing_listing.mint,
            ctx.accounts.backing_ctoken.key(),
            FactoryError::BackingWhitelist
        );
        require_keys_eq!(
            ctx.accounts.fallback_listing.mint,
            ctx.accounts.fallback_ctoken.key(),
            FactoryError::FallbackWhitelist
        );

        let snap_g = ctx.accounts.factory.mint_premium_bps;
        let snap_s = ctx.accounts.factory.sh2_max_slippage_bps;
        let Feasibility::Ok { min_raise, .. } = feasibility(
            params.lp_bps,
            params.sale_bps,
            params.lp_usdc_share_bps,
            params.lp_sol_share_bps,
            snap_g,
            snap_s,
            params.escrow_funding_need,
        ) else {
            return err!(FactoryError::Infeasible);
        };
        require!(params.target_raise >= min_raise, FactoryError::MinRaise);
        require!(
            params.target_raise
                == fixed_target_raise(
                    params.total_supply,
                    params.sale_bps,
                    params.sale_price,
                    params.decimals,
                ),
            FactoryError::FixedRaise
        );

        let mut required_mask = WIRE_EOL
            | WIRE_STAKING
            | WIRE_REGISTER
            | WIRE_POOL_USDC
            | WIRE_POOL_SOL
            | WIRE_VAULTS
            | WIRE_DAO;
        if params.team_bps > 0 {
            required_mask |= WIRE_VESTING;
        }
        if params.escrow_funding_need > 0 {
            required_mask |= WIRE_ESCROW;
            require!(
                ctx.accounts.team_recipient.key() != Pubkey::default(),
                FactoryError::TeamRecipient
            );
        }
        if params.team_bps > 0 {
            require!(
                ctx.accounts.team_recipient.key() != Pubkey::default(),
                FactoryError::TeamRecipient
            );
        }
        if params.dao_bps > 0 {
            require!(
                ctx.accounts.dao_contract.key() != Pubkey::default(),
                FactoryError::DaoUnset
            );
        }

        ctx.accounts.mint_index.set_inner(MintIndex {
            mint: ctx.accounts.mint.key(),
            launch_id,
            bump: ctx.bumps.mint_index,
        });
        ctx.accounts.launch.set_inner(Launch {
            id: launch_id,
            creator: ctx.accounts.creator.key(),
            mint: ctx.accounts.mint.key(),
            eol_config: Pubkey::default(),
            staking: Pubkey::default(),
            vesting: Pubkey::default(),
            escrow: Pubkey::default(),
            pool_usdc: Pubkey::default(),
            pool_sol: Pubkey::default(),
            backing_ctoken: ctx.accounts.backing_ctoken.key(),
            fallback_ctoken: ctx.accounts.fallback_ctoken.key(),
            team_recipient: ctx.accounts.team_recipient.key(),
            dao: ctx.accounts.dao_contract.key(),
            status: STATUS_CREATED,
            wired_mask: 0,
            required_mask,
            timestamp: Clock::get()?.unix_timestamp,
            sale_outcome: transmuter_eol_token::STATUS_SALE,
            mint_premium_bps: snap_g,
            sh2_max_slippage_bps: snap_s,
            min_raise,
            decimals: params.decimals,
            sale_price: params.sale_price,
            target_raise: params.target_raise,
            total_supply: params.total_supply,
            sale_bps: params.sale_bps,
            lp_bps: params.lp_bps,
            lp_sol_share_bps: params.lp_sol_share_bps,
            lp_usdc_share_bps: params.lp_usdc_share_bps,
            team_bps: params.team_bps,
            investor_bps: params.investor_bps,
            dao_bps: params.dao_bps,
            escrow_funding_need: params.escrow_funding_need,
            sale_end: params.sale_end,
            governed_mint_pct_bps: params.governed_mint_pct_bps,
            reserve_mint_activate_pct: params.reserve_mint_activate_pct,
            reserve_mint_deactivate_pct: params.reserve_mint_deactivate_pct,
            reserve_mint_duration_secs: params.reserve_mint_duration_secs,
            reserve_mint_vote_window_secs: params.reserve_mint_vote_window_secs,
            liq_vote_window_secs: params.liq_vote_window_secs,
            convert_chunk: params.convert_chunk,
            vesting_schedule: params.vesting_schedule,
            name: params.name,
            symbol: params.symbol,
            bump: ctx.bumps.launch,
        });
        ctx.accounts.factory.total_launches = ctx
            .accounts
            .factory
            .total_launches
            .checked_add(1)
            .ok_or(FactoryError::Overflow)?;
        Ok(())
    }

    pub fn wire_eol(ctx: Context<WireEol>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require_keys_eq!(launch.mint, ctx.accounts.mint.key(), FactoryError::Mint);
        if launch.wired_mask & WIRE_EOL != 0 {
            return Ok(());
        }
        require!(launch.status == STATUS_CREATED, FactoryError::BadStatus);

        let params = EolParams {
            decimals: launch.decimals,
            sale_price: launch.sale_price,
            total_supply: launch.total_supply,
            sale_bps: launch.sale_bps,
            lp_bps: launch.lp_bps,
            lp_sol_share_bps: launch.lp_sol_share_bps,
            lp_usdc_share_bps: launch.lp_usdc_share_bps,
            team_bps: launch.team_bps,
            investor_bps: launch.investor_bps,
            dao_bps: launch.dao_bps,
            escrow_funding_need: launch.escrow_funding_need,
            sale_end: launch.sale_end,
            sh2_max_slippage_bps: launch.sh2_max_slippage_bps,
            governed_mint_pct_bps: launch.governed_mint_pct_bps,
            reserve_mint_activate_pct: launch.reserve_mint_activate_pct,
            reserve_mint_deactivate_pct: launch.reserve_mint_deactivate_pct,
            reserve_mint_duration_secs: launch.reserve_mint_duration_secs,
            liq_vote_window_secs: launch.liq_vote_window_secs,
            convert_chunk: launch.convert_chunk,
        };
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_eol_token::cpi::initialize(
            CpiContext::new_with_signer(
                ctx.accounts.eol_program.to_account_info(),
                transmuter_eol_token::cpi::accounts::Initialize {
                    payer: ctx.accounts.cranker.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.mint_authority.to_account_info(),
                    config: ctx.accounts.eol_config.to_account_info(),
                    usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
                    ctoken_mint: ctx.accounts.ctoken_mint.to_account_info(),
                    factory: ctx.accounts.factory.to_account_info(),
                    protocol_revenue_wallet: ctx.accounts.protocol_revenue_wallet.to_account_info(),
                    vesting: ctx.accounts.vesting_config.to_account_info(),
                    staking: ctx.accounts.staking_config.to_account_info(),
                    escrow: ctx.accounts.escrow_config.to_account_info(),
                    ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[seeds],
            ),
            params,
        )?;
        launch.eol_config = ctx.accounts.eol_config.key();
        apply_bit(launch, WIRE_EOL);
        Ok(())
    }

    pub fn wire_staking(ctx: Context<WireStaking>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_STAKING != 0 {
            return Ok(());
        }
        require!(launch.wired_mask & WIRE_EOL != 0, FactoryError::NeedEol);
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_staking::cpi::initialize(CpiContext::new_with_signer(
            ctx.accounts.staking_program.to_account_info(),
            transmuter_staking::cpi::accounts::Initialize {
                payer: ctx.accounts.cranker.to_account_info(),
                factory: ctx.accounts.factory.to_account_info(),
                eol_token: ctx.accounts.eol_config.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                config: ctx.accounts.staking_config.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            &[seeds],
        ))?;
        launch.staking = ctx.accounts.staking_config.key();
        apply_bit(launch, WIRE_STAKING);
        Ok(())
    }

    pub fn wire_vesting(ctx: Context<WireVesting>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_VESTING != 0 {
            return Ok(());
        }
        require!(launch.required_mask & WIRE_VESTING != 0, FactoryError::VestingNotRequired);
        require!(launch.wired_mask & WIRE_EOL != 0, FactoryError::NeedEol);
        let team_tokens = bps_tokens(launch.total_supply, launch.team_bps);
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_vesting::cpi::initialize(
            CpiContext::new_with_signer(
                ctx.accounts.vesting_program.to_account_info(),
                transmuter_vesting::cpi::accounts::Initialize {
                    payer: ctx.accounts.cranker.to_account_info(),
                    factory: ctx.accounts.factory.to_account_info(),
                    eol_token: ctx.accounts.eol_config.to_account_info(),
                    founder: ctx.accounts.founder.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    team_recipient: ctx.accounts.team_recipient.to_account_info(),
                    config: ctx.accounts.vesting_config.to_account_info(),
                    team_pot: ctx.accounts.team_pot.to_account_info(),
                    investor_pot: ctx.accounts.investor_pot.to_account_info(),
                    team_entry: ctx.accounts.team_entry.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[seeds],
            ),
            launch.vesting_schedule,
            team_tokens,
        )?;
        launch.vesting = ctx.accounts.vesting_config.key();
        apply_bit(launch, WIRE_VESTING);
        Ok(())
    }

    pub fn wire_escrow(ctx: Context<WireEscrow>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_ESCROW != 0 {
            return Ok(());
        }
        require!(launch.required_mask & WIRE_ESCROW != 0, FactoryError::EscrowNotRequired);
        require!(launch.wired_mask & WIRE_EOL != 0, FactoryError::NeedEol);
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_runway_escrow::cpi::initialize(
            CpiContext::new_with_signer(
                ctx.accounts.escrow_program.to_account_info(),
                transmuter_runway_escrow::cpi::accounts::Initialize {
                    payer: ctx.accounts.cranker.to_account_info(),
                    factory: ctx.accounts.factory.to_account_info(),
                    eol_token: ctx.accounts.eol_config.to_account_info(),
                    usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
                    team_recipient: ctx.accounts.team_recipient.to_account_info(),
                    dao_direct: ctx.accounts.dao.to_account_info(),
                    registry: ctx.accounts.registry.to_account_info(),
                    config: ctx.accounts.escrow_config.to_account_info(),
                    vault: ctx.accounts.vault.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[seeds],
            ),
            launch.vesting_schedule,
        )?;
        launch.escrow = ctx.accounts.escrow_config.key();
        apply_bit(launch, WIRE_ESCROW);
        Ok(())
    }

    pub fn wire_register(ctx: Context<WireRegister>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_REGISTER != 0 {
            return Ok(());
        }
        require!(launch.wired_mask & WIRE_EOL != 0, FactoryError::NeedEol);
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_ctoken::cpi::register_eol(
            CpiContext::new_with_signer(
                ctx.accounts.ctoken_program.to_account_info(),
                transmuter_ctoken::cpi::accounts::RegisterEol {
                    payer: ctx.accounts.cranker.to_account_info(),
                    factory: ctx.accounts.factory.to_account_info(),
                    config: ctx.accounts.ctoken_config.to_account_info(),
                    authority: ctx.accounts.eol_config.to_account_info(),
                    ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                    eol_record: ctx.accounts.eol_record.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[seeds],
            ),
            launch.mint,
        )?;
        apply_bit(launch, WIRE_REGISTER);
        Ok(())
    }

    pub fn wire_dao(ctx: Context<WireBit>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_DAO != 0 {
            return Ok(());
        }
        require!(ctx.accounts.factory.dao != Pubkey::default(), FactoryError::DaoUnset);
        launch.dao = ctx.accounts.factory.dao;
        apply_bit(launch, WIRE_DAO);
        Ok(())
    }

    pub fn wire_pool_usdc(ctx: Context<WirePoolUsdc>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_POOL_USDC != 0 {
            return Ok(());
        }
        require!(launch.wired_mask & WIRE_EOL != 0, FactoryError::NeedEol);
        mock_dex::cpi::initialize(CpiContext::new(
            ctx.accounts.dex_program.to_account_info(),
            mock_dex::cpi::accounts::Initialize {
                payer: ctx.accounts.cranker.to_account_info(),
                withdraw_authority: ctx.accounts.eol_config.to_account_info(),
                mint_a: ctx.accounts.mint.to_account_info(),
                mint_b: ctx.accounts.usdc_mint.to_account_info(),
                pool: ctx.accounts.pool.to_account_info(),
                vault_a: ctx.accounts.vault_a.to_account_info(),
                vault_b: ctx.accounts.vault_b.to_account_info(),
                token_program_a: ctx.accounts.token_program_a.to_account_info(),
                token_program_b: ctx.accounts.token_program_b.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ))?;
        launch.pool_usdc = ctx.accounts.pool.key();
        apply_bit(launch, WIRE_POOL_USDC);
        Ok(())
    }

    pub fn wire_pool_sol(ctx: Context<WirePoolSol>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_POOL_SOL != 0 {
            return Ok(());
        }
        if ctx.accounts.native_pool.data_is_empty() {
            mock_dex::cpi::initialize_native(CpiContext::new(
                ctx.accounts.dex_program.to_account_info(),
                mock_dex::cpi::accounts::InitializeNative {
                    payer: ctx.accounts.cranker.to_account_info(),
                    withdraw_authority: ctx.accounts.eol_config.to_account_info(),
                    usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
                    pool: ctx.accounts.native_pool.to_account_info(),
                    vault_usdc: ctx.accounts.vault_usdc.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ))?;
        }
        launch.pool_sol = ctx.accounts.native_pool.key();
        apply_bit(launch, WIRE_POOL_SOL);
        Ok(())
    }

    pub fn wire_vaults(ctx: Context<WireVaults>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        if launch.wired_mask & WIRE_VAULTS != 0 {
            return Ok(());
        }
        require!(launch.status == STATUS_WIRED, FactoryError::NotWired);
        let bump = [ctx.accounts.factory.bump];
        let seeds: &[&[u8]] = &[b"factory", &bump];
        transmuter_eol_token::cpi::init_vaults(CpiContext::new_with_signer(
            ctx.accounts.eol_program.to_account_info(),
            transmuter_eol_token::cpi::accounts::InitVaults {
                payer: ctx.accounts.cranker.to_account_info(),
                config: ctx.accounts.eol_config.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
                sale_usdc_vault: ctx.accounts.sale_usdc_vault.to_account_info(),
                sale_token_vault: ctx.accounts.sale_token_vault.to_account_info(),
                lp_token_vault: ctx.accounts.lp_token_vault.to_account_info(),
                team_token_vault: ctx.accounts.team_token_vault.to_account_info(),
                treasury_usdc: ctx.accounts.treasury_usdc.to_account_info(),
                fee_vault: ctx.accounts.fee_vault.to_account_info(),
                ctoken_treasury: ctx.accounts.ctoken_treasury.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                usdc_program: ctx.accounts.usdc_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            &[seeds],
        ))?;
        apply_bit(launch, WIRE_VAULTS);
        emit!(TokenLaunched {
            launch_id: launch.id,
            creator: launch.creator,
            mint: launch.mint,
            eol: launch.eol_config,
            staking: launch.staking,
            vesting: launch.vesting,
            escrow: launch.escrow,
        });
        Ok(())
    }

    pub fn sync_outcome(ctx: Context<SyncOutcome>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(
            launch.status == STATUS_SALE
                || launch.status == STATUS_ACTIVE
                || launch.status == STATUS_VOIDED,
            FactoryError::BadStatus
        );
        require_keys_eq!(
            ctx.accounts.eol_config.mint,
            launch.mint,
            FactoryError::Mint
        );
        let st = ctx.accounts.eol_config.status;
        launch.sale_outcome = st;
        if st == transmuter_eol_token::STATUS_ACTIVE {
            launch.status = STATUS_ACTIVE;
        } else if st == transmuter_eol_token::STATUS_VOIDED {
            launch.status = STATUS_VOIDED;
        }
        Ok(())
    }
}

fn validate_params(params: &CreateLaunchParams, factory: &FactoryConfig) -> Result<()> {
    require!(!params.name.is_empty() && !params.symbol.is_empty(), FactoryError::Name);
    require!(params.name.len() <= 32 && params.symbol.len() <= 12, FactoryError::Name);
    require!(params.decimals > 0 && params.total_supply > 0, FactoryError::BadParams);
    require!(params.sale_type == SALE_TYPE_FIXED, FactoryError::SaleType);
    require!(params.sale_price > 0, FactoryError::BadParams);
    require!(params.forfeit_dest == FORFEIT_DEST_TREASURY, FactoryError::ForfeitDest);
    require!(params.sale_bps as u64 >= SALE_PCT_MIN * 100, FactoryError::SalePct);
    require!(params.lp_bps as u64 >= LP_PCT_MIN * 100, FactoryError::LpPct);
    require!(params.team_bps as u64 <= TEAM_PCT_MAX * 100, FactoryError::TeamPct);
    require!(params.investor_bps == 0, FactoryError::InvestorPct);
    require!(params.dao_bps as u64 <= DAO_AIRDROP_PCT_MAX * 100, FactoryError::DaoPct);
    let alloc = params.sale_bps as u32
        + params.lp_bps as u32
        + params.team_bps as u32
        + params.investor_bps as u32
        + params.dao_bps as u32;
    require!(alloc == BPS_DENOM as u32, FactoryError::AllocSum);
    require!(
        params.lp_sol_share_bps as u64 >= LP_SPLIT_MIN_BPS
            && params.lp_sol_share_bps as u64 <= LP_SPLIT_MAX_BPS
            && params.lp_usdc_share_bps as u64 >= LP_SPLIT_MIN_BPS
            && params.lp_usdc_share_bps as u64 <= LP_SPLIT_MAX_BPS
            && (params.lp_sol_share_bps as u64) + (params.lp_usdc_share_bps as u64) == BPS_DENOM,
        FactoryError::LpSplit
    );
    require!(
        params.transfer_fee_bps >= TRANSFER_FEE_MIN_BPS
            && params.transfer_fee_bps <= TRANSFER_FEE_MAX_BPS,
        FactoryError::Fee
    );
    let split = params.fee_lp_bps as u32
        + params.fee_treasury_bps as u32
        + params.fee_ctoken_bps as u32
        + params.fee_protocol_bps as u32
        + params.fee_creator_bps as u32
        + params.fee_burn_bps as u32;
    require!(split == params.transfer_fee_bps as u32, FactoryError::Fee);
    require!(params.fee_ctoken_bps == FEE_CTOKEN_RESERVE_BPS, FactoryError::Fee);
    require!(
        params.fee_protocol_bps >= FEE_PROTOCOL_MIN_BPS
            && params.fee_protocol_bps <= FEE_PROTOCOL_MAX_BPS,
        FactoryError::Fee
    );
    require!(
        params.fee_lp_bps >= FEE_LP_MIN_BPS && params.fee_treasury_bps >= FEE_TREASURY_MIN_BPS,
        FactoryError::Fee
    );
    require!(
        params.fee_creator_bps == 0 || params.fee_creator_bps <= FEE_CREATOR_MAX_BPS,
        FactoryError::Fee
    );
    require!(
        params.fee_burn_bps == 0
            || (params.fee_burn_bps >= FEE_BURN_MIN_BPS && params.fee_burn_bps <= FEE_BURN_MAX_BPS),
        FactoryError::Fee
    );
    require!(
        params.reserve_mint_activate_pct >= RESERVE_MINT_ACTIVATE_MIN_PCT
            && params.reserve_mint_activate_pct <= RESERVE_MINT_ACTIVATE_MAX_PCT,
        FactoryError::ReservePct
    );
    require!(
        params.reserve_mint_deactivate_pct >= RESERVE_MINT_DEACTIVATE_MIN_PCT
            && params.reserve_mint_deactivate_pct <= RESERVE_MINT_DEACTIVATE_MAX_PCT,
        FactoryError::ReservePct
    );
    require!(
        params.reserve_mint_deactivate_pct
            >= params.reserve_mint_activate_pct + RESERVE_MINT_GAP_PCT,
        FactoryError::ReserveGap
    );
    require!(
        params.reserve_mint_vote_window_secs >= RESERVE_MINT_VOTE_WINDOW_MIN_SECS
            && params.reserve_mint_vote_window_secs <= RESERVE_MINT_VOTE_WINDOW_MAX_SECS,
        FactoryError::ReserveVoteWindow
    );
    require!(
        params.governed_mint_pct_bps >= RESERVE_MINT_GOV_MIN_BPS
            && params.governed_mint_pct_bps <= RESERVE_MINT_GOV_MAX_BPS,
        FactoryError::ReservePct
    );
    require!(schedule_kind_ok(params.vesting_schedule), FactoryError::Schedule);
    let now = Clock::get()?.unix_timestamp;
    let window = params.sale_end.saturating_sub(now);
    require!(
        window >= SALE_WINDOW_MIN_SECS && window <= SALE_WINDOW_MAX_SECS,
        FactoryError::SaleWindow
    );
    let _ = factory;
    Ok(())
}

fn apply_bit(launch: &mut Launch, bit: u16) {
    if launch.wired_mask & bit != 0 {
        return;
    }
    launch.wired_mask |= bit;
    let pre_vaults = launch.required_mask & !WIRE_VAULTS;
    if launch.wired_mask & pre_vaults == pre_vaults && launch.status == STATUS_CREATED {
        launch.status = STATUS_WIRED;
    }
    if launch.wired_mask == launch.required_mask {
        launch.status = STATUS_SALE;
        launch.sale_outcome = transmuter_eol_token::STATUS_SALE;
    }
}

#[event]
pub struct TokenLaunched {
    pub launch_id: u64,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub eol: Pubkey,
    pub staking: Pubkey,
    pub vesting: Pubkey,
    pub escrow: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct FactoryConfig {
    pub authority: Pubkey,
    pub protocol_revenue_wallet: Pubkey,
    pub usdc_mint: Pubkey,
    pub registry: Pubkey,
    pub dao: Pubkey,
    pub mint_premium_bps: u64,
    pub sh2_max_slippage_bps: u64,
    pub total_launches: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Launch {
    pub id: u64,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub eol_config: Pubkey,
    pub staking: Pubkey,
    pub vesting: Pubkey,
    pub escrow: Pubkey,
    pub pool_usdc: Pubkey,
    pub pool_sol: Pubkey,
    pub backing_ctoken: Pubkey,
    pub fallback_ctoken: Pubkey,
    pub team_recipient: Pubkey,
    pub dao: Pubkey,
    pub status: u8,
    pub wired_mask: u16,
    pub required_mask: u16,
    pub timestamp: i64,
    pub sale_outcome: u8,
    pub mint_premium_bps: u64,
    pub sh2_max_slippage_bps: u64,
    pub min_raise: u64,
    pub decimals: u8,
    pub sale_price: u64,
    pub target_raise: u64,
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
    pub governed_mint_pct_bps: u16,
    pub reserve_mint_activate_pct: u64,
    pub reserve_mint_deactivate_pct: u64,
    pub reserve_mint_duration_secs: i64,
    pub reserve_mint_vote_window_secs: i64,
    pub liq_vote_window_secs: i64,
    pub convert_chunk: u64,
    pub vesting_schedule: u8,
    #[max_len(32)]
    pub name: String,
    #[max_len(12)]
    pub symbol: String,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MintIndex {
    pub mint: Pubkey,
    pub launch_id: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CTokenListing {
    pub mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct InvestorListing {
    pub wallet: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + FactoryConfig::INIT_SPACE,
        seeds = [b"factory"],
        bump
    )]
    pub factory: Account<'info, FactoryConfig>,
    /// CHECK: protocol revenue destination for future launches.
    pub protocol_revenue_wallet: UncheckedAccount<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: Registry program / config. Snapshotted for escrow wiring.
    pub registry: UncheckedAccount<'info>,
    /// CHECK: DAO program. N12 registration is a bit until the DAO exists.
    pub dao: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Admin<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump, has_one = authority)]
    pub factory: Account<'info, FactoryConfig>,
}

#[derive(Accounts)]
pub struct AddCtoken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"factory"], bump = factory.bump, has_one = authority)]
    pub factory: Account<'info, FactoryConfig>,
    /// CHECK: cToken mint being listed.
    pub mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + CTokenListing::INIT_SPACE,
        seeds = [b"ctoken", mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, CTokenListing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddInvestor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"factory"], bump = factory.bump, has_one = authority)]
    pub factory: Account<'info, FactoryConfig>,
    /// CHECK: investor wallet.
    pub wallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + InvestorListing::INIT_SPACE,
        seeds = [b"investor", wallet.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, InvestorListing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(launch_id: u64)]
pub struct CreateLaunch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    /// CHECK: future EOL mint. Created at wire_eol.
    pub mint: UncheckedAccount<'info>,
    /// CHECK: backing cToken mint (must be listed).
    pub backing_ctoken: UncheckedAccount<'info>,
    /// CHECK: fallback cToken mint (must be listed and differ).
    pub fallback_ctoken: UncheckedAccount<'info>,
    #[account(
        seeds = [b"ctoken", backing_ctoken.key().as_ref()],
        bump = backing_listing.bump
    )]
    pub backing_listing: Account<'info, CTokenListing>,
    #[account(
        seeds = [b"ctoken", fallback_ctoken.key().as_ref()],
        bump = fallback_listing.bump
    )]
    pub fallback_listing: Account<'info, CTokenListing>,
    /// CHECK: team recipient; required when team_bps or escrow ask is set.
    pub team_recipient: UncheckedAccount<'info>,
    /// CHECK: dao contract; required when dao_bps > 0.
    pub dao_contract: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Launch::INIT_SPACE,
        seeds = [b"launch", launch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub launch: Account<'info, Launch>,
    #[account(
        init,
        payer = creator,
        space = 8 + MintIndex::INIT_SPACE,
        seeds = [b"mint", mint.key().as_ref()],
        bump
    )]
    pub mint_index: Account<'info, MintIndex>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireEol<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: PDA mint authority.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump, seeds::program = eol_program.key())]
    pub mint_authority: UncheckedAccount<'info>,
    /// CHECK: EOL config PDA. Initialized by CPI.
    #[account(mut, seeds = [b"config", mint.key().as_ref()], bump, seeds::program = eol_program.key())]
    pub eol_config: UncheckedAccount<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: backing cToken mint.
    pub ctoken_mint: UncheckedAccount<'info>,
    /// CHECK:
    pub protocol_revenue_wallet: UncheckedAccount<'info>,
    /// CHECK: vesting config PDA (or System if unused).
    pub vesting_config: UncheckedAccount<'info>,
    /// CHECK: staking config PDA.
    pub staking_config: UncheckedAccount<'info>,
    /// CHECK: escrow config PDA (or System if unused).
    pub escrow_config: UncheckedAccount<'info>,
    /// CHECK: ATA of eol_config for the cToken.
    pub ctoken_treasury: UncheckedAccount<'info>,
    pub eol_program: Program<'info, TransmuterEolToken>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireStaking<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: EOL config.
    pub eol_config: UncheckedAccount<'info>,
    /// CHECK: staking config PDA. Initialized by CPI.
    #[account(mut)]
    pub staking_config: UncheckedAccount<'info>,
    /// CHECK: new stake vault. Must sign on first wire.
    #[account(mut)]
    pub vault: Signer<'info>,
    pub staking_program: Program<'info, TransmuterStaking>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireVesting<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    pub eol_config: UncheckedAccount<'info>,
    /// CHECK:
    pub founder: UncheckedAccount<'info>,
    /// CHECK:
    pub team_recipient: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub vesting_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub team_pot: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub investor_pot: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub team_entry: UncheckedAccount<'info>,
    pub vesting_program: Program<'info, TransmuterVesting>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireEscrow<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    /// CHECK:
    pub eol_config: UncheckedAccount<'info>,
    pub usdc_mint: Box<Account<'info, anchor_spl::token::Mint>>,
    /// CHECK:
    pub team_recipient: UncheckedAccount<'info>,
    /// CHECK:
    pub dao: UncheckedAccount<'info>,
    /// CHECK:
    pub registry: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub escrow_config: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub vault: Signer<'info>,
    pub escrow_program: Program<'info, TransmuterRunwayEscrow>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireRegister<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    /// CHECK:
    pub eol_config: UncheckedAccount<'info>,
    pub ctoken_program: Program<'info, TransmuterCtoken>,
    /// CHECK: cToken config. Factory must match the snapshotted registrar.
    pub ctoken_config: UncheckedAccount<'info>,
    pub ctoken_treasury: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK:
    #[account(mut)]
    pub eol_record: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireBit<'info> {
    pub cranker: Signer<'info>,
    #[account(seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
}

#[derive(Accounts)]
pub struct WirePoolUsdc<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    /// CHECK:
    pub eol_config: UncheckedAccount<'info>,
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub vault_a: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub vault_b: Signer<'info>,
    pub dex_program: Program<'info, MockDex>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WirePoolSol<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    /// CHECK:
    pub eol_config: UncheckedAccount<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    #[account(mut)]
    pub native_pool: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub vault_usdc: Signer<'info>,
    pub dex_program: Program<'info, MockDex>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WireVaults<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"factory"], bump = factory.bump)]
    pub factory: Account<'info, FactoryConfig>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    /// CHECK:
    #[account(mut)]
    pub eol_config: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    pub mint_authority: UncheckedAccount<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK:
    #[account(mut)]
    pub sale_usdc_vault: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub sale_token_vault: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub lp_token_vault: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub team_token_vault: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub treasury_usdc: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub fee_vault: Signer<'info>,
    /// CHECK:
    pub ctoken_treasury: UncheckedAccount<'info>,
    pub eol_program: Program<'info, TransmuterEolToken>,
    pub token_program: Program<'info, Token2022>,
    pub usdc_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SyncOutcome<'info> {
    pub cranker: Signer<'info>,
    #[account(mut, seeds = [b"launch", launch.id.to_le_bytes().as_ref()], bump = launch.bump)]
    pub launch: Account<'info, Launch>,
    #[account(
        seeds = [b"config", launch.mint.as_ref()],
        bump,
        seeds::program = transmuter_eol_token::ID
    )]
    pub eol_config: Account<'info, transmuter_eol_token::Config>,
}

#[error_code]
pub enum FactoryError {
    #[msg("launch id does not match totalLaunches")]
    LaunchId,
    #[msg("name/symbol empty or too long")]
    Name,
    #[msg("bad launch params")]
    BadParams,
    #[msg("only FIXED sales are in MVP scope")]
    SaleType,
    #[msg("forfeit destination must be treasury")]
    ForfeitDest,
    #[msg("sale pct below minimum")]
    SalePct,
    #[msg("lp pct below minimum")]
    LpPct,
    #[msg("team pct above maximum")]
    TeamPct,
    #[msg("investor allocation is not in MVP scope")]
    InvestorPct,
    #[msg("dao airdrop pct above maximum")]
    DaoPct,
    #[msg("allocation percentages must sum to 100%")]
    AllocSum,
    #[msg("lp split invalid")]
    LpSplit,
    #[msg("transfer fee / split invalid")]
    Fee,
    #[msg("reserve-mint bounds")]
    ReservePct,
    #[msg("reserve-mint gap")]
    ReserveGap,
    #[msg("reserve-mint vote window")]
    ReserveVoteWindow,
    #[msg("vesting schedule")]
    Schedule,
    #[msg("sale window must be 1–60 days")]
    SaleWindow,
    #[msg("fallback cToken equals backing")]
    FallbackSame,
    #[msg("backing cToken is not whitelisted")]
    BackingWhitelist,
    #[msg("fallback cToken is not whitelisted")]
    FallbackWhitelist,
    #[msg("launch is infeasible at snapshotted g/L")]
    Infeasible,
    #[msg("targetRaise below minRaise")]
    MinRaise,
    #[msg("FIXED salePrice * salePct * supply != targetRaise")]
    FixedRaise,
    #[msg("team recipient required")]
    TeamRecipient,
    #[msg("dao contract required")]
    DaoUnset,
    #[msg("mint mismatch")]
    Mint,
    #[msg("bad launch status")]
    BadStatus,
    #[msg("EOL must be wired first")]
    NeedEol,
    #[msg("vesting is not required for this launch")]
    VestingNotRequired,
    #[msg("escrow is not required for this launch")]
    EscrowNotRequired,
    #[msg("wiring incomplete; SALE is unreachable")]
    NotWired,
    #[msg("overflow")]
    Overflow,
}
