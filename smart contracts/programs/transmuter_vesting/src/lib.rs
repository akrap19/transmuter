use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use transmuter_constants::{schedule_kind_ok, vested_amount, WALLET_CHANGE_DELAY_SECS};

declare_id!("9p1LttUtL5Skg568m24NYj1DgsZAWaAcNn3w95CjJMJ4");

pub const KIND_TEAM: u8 = 0;
pub const KIND_INVESTOR: u8 = 1;
pub const KIND_OTHER: u8 = 2;

/// Two-pot vesting. Liquidation burns unvested TEAM only (`if kind == TEAM`).
#[program]
pub mod transmuter_vesting {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        schedule: u8,
        team_allocation: u64,
    ) -> Result<()> {
        require!(schedule_kind_ok(schedule), VestingError::BadSchedule);
        require!(team_allocation > 0, VestingError::TeamCount);
        ctx.accounts.config.set_inner(VestingConfig {
            eol_token: ctx.accounts.eol_token.key(),
            mint: ctx.accounts.mint.key(),
            founder: ctx.accounts.founder.key(),
            team_pot: ctx.accounts.team_pot.key(),
            investor_pot: ctx.accounts.investor_pot.key(),
            team_entry: ctx.accounts.team_entry.key(),
            schedule,
            start_time: 0,
            liquidation_timestamp: 0,
            team_count: 1,
            team_allocated: team_allocation,
            investor_allocated: 0,
            bump: ctx.bumps.config,
        });
        ctx.accounts.team_entry.set_inner(VestingEntry {
            config: ctx.accounts.config.key(),
            recipient: ctx.accounts.team_recipient.key(),
            total_allocation: team_allocation,
            already_claimed: 0,
            kind: KIND_TEAM,
            pending_wallet: Pubkey::default(),
            pending_after: 0,
            bump: ctx.bumps.team_entry,
        });
        Ok(())
    }

    pub fn stamp_start_time(ctx: Context<StampStartTime>, unix_ts: i64) -> Result<()> {
        require!(ctx.accounts.config.start_time == 0, VestingError::AlreadyStamped);
        let now = Clock::get()?.unix_timestamp;
        require!(unix_ts > 0 && unix_ts <= now, VestingError::BadTimestamp);
        ctx.accounts.config.start_time = unix_ts;
        Ok(())
    }

    pub fn push_entry(
        ctx: Context<PushEntry>,
        recipient: Pubkey,
        amount: u64,
        kind: u8,
    ) -> Result<()> {
        require!(amount > 0, VestingError::ZeroAmount);
        require!(
            ctx.accounts.config.liquidation_timestamp == 0,
            VestingError::AfterLiquidation
        );
        require!(kind != KIND_TEAM, VestingError::TeamCount);
        require!(kind == KIND_INVESTOR || kind == KIND_OTHER, VestingError::BadKind);
        let cfg = &mut ctx.accounts.config;
        if kind == KIND_INVESTOR {
            require_keys_eq!(ctx.accounts.pot.key(), cfg.investor_pot);
            cfg.investor_allocated = cfg
                .investor_allocated
                .checked_add(amount)
                .ok_or(error!(VestingError::Overflow))?;
            require!(
                cfg.investor_allocated <= ctx.accounts.pot.amount,
                VestingError::AllocExceedsPot
            );
        } else {
            require_keys_eq!(ctx.accounts.pot.key(), cfg.team_pot);
            cfg.team_allocated = cfg
                .team_allocated
                .checked_add(amount)
                .ok_or(error!(VestingError::Overflow))?;
            require!(
                cfg.team_allocated <= ctx.accounts.pot.amount,
                VestingError::AllocExceedsPot
            );
        }
        ctx.accounts.entry.set_inner(VestingEntry {
            config: cfg.key(),
            recipient,
            total_allocation: amount,
            already_claimed: 0,
            kind,
            pending_wallet: Pubkey::default(),
            pending_after: 0,
            bump: ctx.bumps.entry,
        });
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(cfg.start_time != 0, VestingError::NotStarted);
        // After the write-down, total_allocation is already the vested-at-stamp
        // cap. Re-running the live schedule on that smaller total would
        // underpay (and a second notify would burn the remainder).
        let vested = if cfg.liquidation_timestamp != 0 && ctx.accounts.entry.kind == KIND_TEAM {
            ctx.accounts.entry.total_allocation
        } else {
            vested_amount(
                ctx.accounts.entry.total_allocation,
                cfg.start_time,
                Clock::get()?.unix_timestamp,
                cfg.schedule,
            )
        };
        let claimable = vested.saturating_sub(ctx.accounts.entry.already_claimed);
        require!(claimable > 0, VestingError::ZeroClaimable);
        require!(ctx.accounts.pot.amount >= claimable, VestingError::InsufficientPot);
        ctx.accounts.entry.already_claimed = ctx
            .accounts
            .entry
            .already_claimed
            .saturating_add(claimable);
        let seeds: &[&[u8]] = &[b"config", cfg.mint.as_ref(), &[cfg.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pot.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[seeds],
            ),
            claimable,
        )?;
        ctx.accounts.pot.reload()?;
        Ok(())
    }

    pub fn notify_liquidation(ctx: Context<NotifyLiquidation>) -> Result<()> {
        if ctx.accounts.config.liquidation_timestamp != 0 {
            return Ok(());
        }
        require!(ctx.accounts.config.start_time != 0, VestingError::NotStarted);
        let start = ctx.accounts.config.start_time;
        let schedule = ctx.accounts.config.schedule;
        let mint = ctx.accounts.config.mint;
        let bump = ctx.accounts.config.bump;
        ctx.accounts.config.liquidation_timestamp = Clock::get()?.unix_timestamp;
        let stamp = ctx.accounts.config.liquidation_timestamp;
        let entry = &mut ctx.accounts.team_entry;
        require!(entry.kind == KIND_TEAM, VestingError::TeamCount);
        let vested = vested_amount(entry.total_allocation, start, stamp, schedule);
        let unvested = entry.total_allocation.saturating_sub(vested);
        if unvested > 0 {
            require!(
                ctx.accounts.team_pot.amount >= unvested,
                VestingError::InsufficientPot
            );
            let bump_seed = [bump];
            let seeds: &[&[u8]] = &[b"config", mint.as_ref(), &bump_seed];
            token::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.mint.to_account_info(),
                        from: ctx.accounts.team_pot.to_account_info(),
                        authority: ctx.accounts.config.to_account_info(),
                    },
                    &[seeds],
                ),
                unvested,
            )?;
            ctx.accounts.team_pot.reload()?;
            entry.total_allocation = vested;
            ctx.accounts.config.team_allocated =
                ctx.accounts.config.team_allocated.saturating_sub(unvested);
        }
        Ok(())
    }

    pub fn initiate_wallet_change(ctx: Context<WalletChange>, new_wallet: Pubkey) -> Result<()> {
        require!(new_wallet != Pubkey::default(), VestingError::BadWallet);
        require!(new_wallet != ctx.accounts.entry.recipient, VestingError::BadWallet);
        ctx.accounts.entry.pending_wallet = new_wallet;
        ctx.accounts.entry.pending_after =
            Clock::get()?.unix_timestamp.saturating_add(WALLET_CHANGE_DELAY_SECS);
        Ok(())
    }

    pub fn cancel_wallet_change(ctx: Context<WalletChange>) -> Result<()> {
        ctx.accounts.entry.pending_wallet = Pubkey::default();
        ctx.accounts.entry.pending_after = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub factory: Signer<'info>,
    /// CHECK: paired EOL Token; signs stamp + notify.
    pub eol_token: UncheckedAccount<'info>,
    /// CHECK: founder who may push entries.
    pub founder: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: team recipient wallet.
    pub team_recipient: UncheckedAccount<'info>,
    #[account(
        init,
        payer = factory,
        space = 8 + VestingConfig::INIT_SPACE,
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, VestingConfig>,
    #[account(
        init,
        payer = factory,
        token::mint = mint,
        token::authority = config
    )]
    pub team_pot: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = factory,
        token::mint = mint,
        token::authority = config
    )]
    pub investor_pot: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = factory,
        space = 8 + VestingEntry::INIT_SPACE,
        seeds = [b"entry", config.key().as_ref(), team_recipient.key().as_ref()],
        bump
    )]
    pub team_entry: Account<'info, VestingEntry>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StampStartTime<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, VestingConfig>,
}

#[derive(Accounts)]
#[instruction(recipient: Pubkey)]
pub struct PushEntry<'info> {
    #[account(mut)]
    pub founder: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = founder
    )]
    pub config: Account<'info, VestingConfig>,
    pub pot: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = founder,
        space = 8 + VestingEntry::INIT_SPACE,
        seeds = [b"entry", config.key().as_ref(), recipient.as_ref()],
        bump
    )]
    pub entry: Account<'info, VestingEntry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub recipient: Signer<'info>,
    #[account(
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, VestingConfig>,
    #[account(
        mut,
        constraint = entry.config == config.key(),
        constraint = entry.recipient == recipient.key() @ VestingError::BadWallet
    )]
    pub entry: Account<'info, VestingEntry>,
    #[account(
        mut,
        constraint = (entry.kind == KIND_INVESTOR && pot.key() == config.investor_pot)
            || (entry.kind != KIND_INVESTOR && pot.key() == config.team_pot)
    )]
    pub pot: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.mint)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct NotifyLiquidation<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump,
        has_one = eol_token,
        has_one = mint,
        has_one = team_pot,
        has_one = team_entry
    )]
    pub config: Account<'info, VestingConfig>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub team_pot: Account<'info, TokenAccount>,
    #[account(mut)]
    pub team_entry: Account<'info, VestingEntry>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WalletChange<'info> {
    pub recipient: Signer<'info>,
    #[account(
        mut,
        seeds = [b"entry", entry.config.as_ref(), recipient.key().as_ref()],
        bump = entry.bump,
        constraint = entry.recipient == recipient.key()
    )]
    pub entry: Account<'info, VestingEntry>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingConfig {
    pub eol_token: Pubkey,
    pub mint: Pubkey,
    pub founder: Pubkey,
    pub team_pot: Pubkey,
    pub investor_pot: Pubkey,
    pub team_entry: Pubkey,
    pub schedule: u8,
    pub start_time: i64,
    pub liquidation_timestamp: i64,
    pub team_count: u8,
    pub team_allocated: u64,
    pub investor_allocated: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VestingEntry {
    pub config: Pubkey,
    pub recipient: Pubkey,
    pub total_allocation: u64,
    pub already_claimed: u64,
    pub kind: u8,
    pub pending_wallet: Pubkey,
    pub pending_after: i64,
    pub bump: u8,
}

#[error_code]
pub enum VestingError {
    #[msg("schedule kind is not a known preset")]
    BadSchedule,
    #[msg("exactly one TEAM entry is required; a second TEAM push is forbidden")]
    TeamCount,
    #[msg("amount must be greater than zero")]
    ZeroAmount,
    #[msg("entry kind is not investor or other")]
    BadKind,
    #[msg("pot allocations would exceed tokens sitting in that pot")]
    AllocExceedsPot,
    #[msg("startTime has not been stamped")]
    NotStarted,
    #[msg("startTime already stamped")]
    AlreadyStamped,
    #[msg("timestamp must be > 0 and not in the future")]
    BadTimestamp,
    #[msg("nothing claimable")]
    ZeroClaimable,
    #[msg("pot holds less than the claimable amount")]
    InsufficientPot,
    #[msg("no push after liquidation stamp")]
    AfterLiquidation,
    #[msg("wallet is invalid or already the recipient")]
    BadWallet,
    #[msg("no pending wallet change")]
    NoPending,
    #[msg("48-hour timelock has not elapsed")]
    Timelock,
    #[msg("arithmetic overflow")]
    Overflow,
}
