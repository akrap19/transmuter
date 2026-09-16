use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("729ofbpZHYSodUi5ZKXibCFeYCHy9bQ7ojuWrYXLBcZZ");

/// Staking is a change of custody, not of owner. Unstake returns only to the
/// staking account. Transfer-fee gross-up is a no-op while fee_bps is 0.
#[program]
pub mod transmuter_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.config.set_inner(StakeConfig {
            eol_token: ctx.accounts.eol_token.key(),
            mint: ctx.accounts.mint.key(),
            vault: ctx.accounts.vault.key(),
            total_staked: 0,
            fee_bps: 0,
            liquidated: false,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);
        require!(!ctx.accounts.config.liquidated, StakeError::Liquidated);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.vault.reload()?;
        let rec = &mut ctx.accounts.stake_account;
        if rec.owner == Pubkey::default() {
            rec.owner = ctx.accounts.owner.key();
            rec.config = ctx.accounts.config.key();
            rec.bump = ctx.bumps.stake_account;
        }
        rec.amount = rec.amount.saturating_add(amount);
        rec.ever_staked = rec.ever_staked.saturating_add(amount);
        ctx.accounts.config.total_staked = ctx.accounts.config.total_staked.saturating_add(amount);
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::ZeroAmount);
        let rec = &mut ctx.accounts.stake_account;
        require!(rec.amount >= amount, StakeError::InsufficientStake);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= rec.lock_until, StakeError::VoterLock);
        require!(!rec.frozen, StakeError::Frozen);
        rec.amount = rec.amount.saturating_sub(amount);
        rec.ever_unstaked = rec.ever_unstaked.saturating_add(amount);
        ctx.accounts.config.total_staked = ctx.accounts.config.total_staked.saturating_sub(amount);
        let gross = gross_up(amount, ctx.accounts.config.fee_bps)?;
        require!(ctx.accounts.vault.amount >= gross, StakeError::InsufficientVault);
        let cfg = &ctx.accounts.config;
        let seeds: &[&[u8]] = &[b"config", cfg.mint.as_ref(), &[cfg.bump]];
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
            gross,
        )?;
        ctx.accounts.vault.reload()?;
        Ok(())
    }

    pub fn set_voter_lock(ctx: Context<SetVoterLock>, lock_until: i64) -> Result<()> {
        let rec = &mut ctx.accounts.stake_account;
        if lock_until > rec.lock_until {
            rec.lock_until = lock_until;
        }
        Ok(())
    }

    pub fn snapshot_weight(ctx: Context<SnapshotWeight>) -> Result<()> {
        let weight = if ctx.accounts.stake_account.frozen {
            0
        } else {
            ctx.accounts.stake_account.amount
        };
        ctx.accounts.snapshot.set_inner(VoteSnapshot {
            config: ctx.accounts.config.key(),
            vote_id: ctx.accounts.vote_id.key(),
            voter: ctx.accounts.stake_account.owner,
            weight,
            total_staked_at_open: ctx.accounts.config.total_staked,
            bump: ctx.bumps.snapshot,
        });
        Ok(())
    }

    pub fn notify_liquidation(ctx: Context<NotifyLiquidation>) -> Result<()> {
        ctx.accounts.config.liquidated = true;
        Ok(())
    }
}

fn gross_up(amount: u64, fee_bps: u16) -> Result<u64> {
    if fee_bps == 0 {
        return Ok(amount);
    }
    let denom = 10_000u128.saturating_sub(fee_bps as u128);
    require!(denom > 0, StakeError::BadFee);
    let gross = (amount as u128)
        .checked_mul(10_000)
        .ok_or(error!(StakeError::Overflow))?
        / denom;
    u64::try_from(gross).map_err(|_| error!(StakeError::Overflow))
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub factory: Signer<'info>,
    /// CHECK: paired EOL Token.
    pub eol_token: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = factory,
        space = 8 + StakeConfig::INIT_SPACE,
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, StakeConfig>,
    #[account(
        init,
        payer = factory,
        token::mint = mint,
        token::authority = config
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump,
        has_one = mint,
        has_one = vault
    )]
    pub config: Account<'info, StakeConfig>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner
    )]
    pub source: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [b"stake", config.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump,
        has_one = mint,
        has_one = vault
    )]
    pub config: Account<'info, StakeConfig>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"stake", config.key().as_ref(), owner.key().as_ref()],
        bump = stake_account.bump,
        has_one = owner
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner
    )]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetVoterLock<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, StakeConfig>,
    #[account(
        mut,
        seeds = [b"stake", config.key().as_ref(), stake_account.owner.as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
}

#[derive(Accounts)]
pub struct SnapshotWeight<'info> {
    #[account(mut)]
    pub eol_token: Signer<'info>,
    #[account(
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, StakeConfig>,
    #[account(
        seeds = [b"stake", config.key().as_ref(), stake_account.owner.as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    /// CHECK: vote identifier (32 bytes). No account data required.
    pub vote_id: UncheckedAccount<'info>,
    #[account(
        init,
        payer = eol_token,
        space = 8 + VoteSnapshot::INIT_SPACE,
        seeds = [b"snapshot", config.key().as_ref(), vote_id.key().as_ref(), stake_account.owner.as_ref()],
        bump
    )]
    pub snapshot: Account<'info, VoteSnapshot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NotifyLiquidation<'info> {
    pub eol_token: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = eol_token
    )]
    pub config: Account<'info, StakeConfig>,
}

#[account]
#[derive(InitSpace)]
pub struct StakeConfig {
    pub eol_token: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub total_staked: u64,
    pub fee_bps: u16,
    pub liquidated: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub config: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub ever_staked: u64,
    pub ever_unstaked: u64,
    pub lock_until: i64,
    pub frozen: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteSnapshot {
    pub config: Pubkey,
    pub vote_id: Pubkey,
    pub voter: Pubkey,
    pub weight: u64,
    pub total_staked_at_open: u64,
    pub bump: u8,
}

#[error_code]
pub enum StakeError {
    #[msg("amount must be greater than zero")]
    ZeroAmount,
    #[msg("new staking is disabled after liquidation")]
    Liquidated,
    #[msg("staked balance is too low")]
    InsufficientStake,
    #[msg("voter lock has not expired")]
    VoterLock,
    #[msg("stake is frozen (N4-E)")]
    Frozen,
    #[msg("vault cannot cover the gross-up")]
    InsufficientVault,
    #[msg("fee_bps must be < 10000")]
    BadFee,
    #[msg("arithmetic overflow")]
    Overflow,
}
