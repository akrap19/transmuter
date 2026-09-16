use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use transmuter_constants::{schedule_kind_ok, vested_amount};

declare_id!("Dy1ddZeaR7GL2QPxWnogrFmdYio4eE5Hrm613SS2PbdK");

pub const STATUS_ACTIVE: u8 = 0;
pub const STATUS_HALTED: u8 = 1;
pub const STATUS_LIQUIDATED: u8 = 2;

/// USDC runway. Governance may halt/resume/advance; it never moves the money.
/// `notify_liquidation` is the only non-draw transfer (to the EOL treasury).
#[program]
pub mod transmuter_runway_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, schedule: u8) -> Result<()> {
        require!(schedule_kind_ok(schedule), EscrowError::BadSchedule);
        ctx.accounts.config.set_inner(EscrowConfig {
            eol_token: ctx.accounts.eol_token.key(),
            usdc_mint: ctx.accounts.usdc_mint.key(),
            vault: ctx.accounts.vault.key(),
            team_recipient: ctx.accounts.team_recipient.key(),
            dao_direct: ctx.accounts.dao_direct.key(),
            registry: ctx.accounts.registry.key(),
            schedule,
            start_time: 0,
            funded_principal: 0,
            already_drawn: 0,
            advance_unlocked: 0,
            status: STATUS_ACTIVE,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn stamp_start_time(ctx: Context<StampStartTime>, unix_ts: i64) -> Result<()> {
        require!(ctx.accounts.config.start_time == 0, EscrowError::AlreadyStamped);
        let now = Clock::get()?.unix_timestamp;
        require!(unix_ts > 0 && unix_ts <= now, EscrowError::BadTimestamp);
        ctx.accounts.config.start_time = unix_ts;
        Ok(())
    }

    pub fn fund(ctx: Context<Fund>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);
        require!(ctx.accounts.config.funded_principal == 0, EscrowError::AlreadyFunded);
        require!(ctx.accounts.config.start_time != 0, EscrowError::NotStarted);
        let before = ctx.accounts.vault.amount;
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.eol_token.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.vault.reload()?;
        let received = ctx.accounts.vault.amount.saturating_sub(before);
        require!(received == amount, EscrowError::DepositMismatch);
        ctx.accounts.config.funded_principal = received;
        Ok(())
    }

    pub fn draw(ctx: Context<Draw>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EscrowError::NotActive);
        require!(ctx.accounts.config.start_time != 0, EscrowError::NotStarted);
        let released = released_to_date(&ctx.accounts.config, Clock::get()?.unix_timestamp);
        let drawable = released.saturating_sub(ctx.accounts.config.already_drawn);
        require!(drawable > 0, EscrowError::ZeroDraw);
        require!(ctx.accounts.vault.amount >= drawable, EscrowError::InsufficientVault);
        ctx.accounts.config.already_drawn =
            ctx.accounts.config.already_drawn.saturating_add(drawable);
        let eol = ctx.accounts.config.eol_token;
        let usdc = ctx.accounts.config.usdc_mint;
        let bump = ctx.accounts.config.bump;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"config", eol.as_ref(), usdc.as_ref(), &bump_seed];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[seeds],
            ),
            drawable,
        )?;
        ctx.accounts.vault.reload()?;
        Ok(())
    }

    pub fn halt(ctx: Context<Governance>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_ACTIVE, EscrowError::NotActive);
        ctx.accounts.config.status = STATUS_HALTED;
        Ok(())
    }

    pub fn resume(ctx: Context<Governance>) -> Result<()> {
        require!(ctx.accounts.config.status == STATUS_HALTED, EscrowError::NotHalted);
        ctx.accounts.config.status = STATUS_ACTIVE;
        Ok(())
    }

    /// Holder-path only (paired EOL). Unlocks extra USDC now, still capped at principal.
    pub fn advance(ctx: Context<Advance>, amount: u64) -> Result<()> {
        require!(amount > 0, EscrowError::ZeroAmount);
        require!(ctx.accounts.config.status != STATUS_LIQUIDATED, EscrowError::Liquidated);
        let cfg = &mut ctx.accounts.config;
        cfg.advance_unlocked = cfg
            .advance_unlocked
            .saturating_add(amount)
            .min(cfg.funded_principal);
        Ok(())
    }

    pub fn notify_liquidation(ctx: Context<NotifyLiquidation>) -> Result<()> {
        if ctx.accounts.config.status == STATUS_LIQUIDATED {
            return Ok(());
        }
        ctx.accounts.config.status = STATUS_LIQUIDATED;
        let remaining = ctx.accounts.vault.amount;
        if remaining > 0 {
            let eol = ctx.accounts.config.eol_token;
            let usdc = ctx.accounts.config.usdc_mint;
            let bump = ctx.accounts.config.bump;
            let bump_seed = [bump];
            let seeds: &[&[u8]] = &[b"config", eol.as_ref(), usdc.as_ref(), &bump_seed];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.eol_treasury.to_account_info(),
                        authority: ctx.accounts.config.to_account_info(),
                    },
                    &[seeds],
                ),
                remaining,
            )?;
            ctx.accounts.vault.reload()?;
        }
        Ok(())
    }
}

fn released_to_date(cfg: &EscrowConfig, now: i64) -> u64 {
    let scheduled = vested_amount(cfg.funded_principal, cfg.start_time, now, cfg.schedule);
    scheduled
        .saturating_add(cfg.advance_unlocked)
        .min(cfg.funded_principal)
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub factory: Signer<'info>,
    /// CHECK: paired EOL Token.
    pub eol_token: UncheckedAccount<'info>,
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: team draw wallet.
    pub team_recipient: UncheckedAccount<'info>,
    /// CHECK: DAO-direct door for halt/resume until Registry shims exist.
    pub dao_direct: UncheckedAccount<'info>,
    /// CHECK: Registry; DAO pointer is resolved live later. Snapshotted so the creator cannot swap it.
    pub registry: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + EscrowConfig::INIT_SPACE,
        seeds = [b"config", eol_token.key().as_ref(), usdc_mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(
        init,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = config
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StampStartTime<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, EscrowConfig>,
}

#[derive(Accounts)]
pub struct Fund<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        has_one = eol_token,
        has_one = vault
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = eol_token)]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Draw<'info> {
    pub team_recipient: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        has_one = team_recipient,
        has_one = vault
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = config.usdc_mint,
        token::authority = team_recipient
    )]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Governance<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        constraint = authority.key() == config.eol_token || authority.key() == config.dao_direct
            @ EscrowError::Unauthorized
    )]
    pub config: Account<'info, EscrowConfig>,
}

#[derive(Accounts)]
pub struct Advance<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, EscrowConfig>,
}

#[derive(Accounts)]
pub struct NotifyLiquidation<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.eol_token.as_ref(), config.usdc_mint.as_ref()],
        bump = config.bump,
        has_one = eol_token,
        has_one = vault
    )]
    pub config: Account<'info, EscrowConfig>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.usdc_mint)]
    pub eol_treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowConfig {
    pub eol_token: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub team_recipient: Pubkey,
    pub dao_direct: Pubkey,
    pub registry: Pubkey,
    pub schedule: u8,
    pub start_time: i64,
    pub funded_principal: u64,
    pub already_drawn: u64,
    pub advance_unlocked: u64,
    pub status: u8,
    pub bump: u8,
}

#[error_code]
pub enum EscrowError {
    #[msg("schedule kind is not a known preset")]
    BadSchedule,
    #[msg("amount must be greater than zero")]
    ZeroAmount,
    #[msg("startTime already stamped")]
    AlreadyStamped,
    #[msg("timestamp must be > 0 and not in the future")]
    BadTimestamp,
    #[msg("startTime has not been stamped")]
    NotStarted,
    #[msg("escrow already funded")]
    AlreadyFunded,
    #[msg("lamports/tokens received did not match amount")]
    DepositMismatch,
    #[msg("escrow is not ACTIVE")]
    NotActive,
    #[msg("escrow is not HALTED")]
    NotHalted,
    #[msg("escrow is LIQUIDATED")]
    Liquidated,
    #[msg("nothing to draw")]
    ZeroDraw,
    #[msg("vault holds less than drawable")]
    InsufficientVault,
    #[msg("caller is not the paired EOL Token or the DAO-direct door")]
    Unauthorized,
}
