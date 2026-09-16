use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV");

/// Constant-product pool used only to exercise swap CPIs on the finalize
/// compute path. Not a production AMM. Slippage is enforced as min_out (SH2).
#[program]
pub mod mock_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.mint_a = ctx.accounts.mint_a.key();
        pool.mint_b = ctx.accounts.mint_b.key();
        pool.vault_a = ctx.accounts.vault_a.key();
        pool.vault_b = ctx.accounts.vault_b.key();
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_out: u64, a_to_b: bool) -> Result<()> {
        require!(amount_in > 0, MockDexError::ZeroAmount);

        let (reserve_in, reserve_out) = if a_to_b {
            (ctx.accounts.vault_a.amount, ctx.accounts.vault_b.amount)
        } else {
            (ctx.accounts.vault_b.amount, ctx.accounts.vault_a.amount)
        };
        require!(reserve_in > 0 && reserve_out > 0, MockDexError::EmptyPool);

        let amount_in_u128 = amount_in as u128;
        let reserve_in_u128 = reserve_in as u128;
        let reserve_out_u128 = reserve_out as u128;
        let amount_out = reserve_out_u128
            .checked_mul(amount_in_u128)
            .ok_or(MockDexError::Math)?
            .checked_div(
                reserve_in_u128
                    .checked_add(amount_in_u128)
                    .ok_or(MockDexError::Math)?,
            )
            .ok_or(MockDexError::Math)? as u64;

        require!(amount_out >= min_out, MockDexError::Slippage);

        let bump = ctx.accounts.pool.bump;
        let seeds: &[&[u8]] = &[b"pool", &[bump]];
        let signer = &[seeds];

        if a_to_b {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_source.to_account_info(),
                        to: ctx.accounts.vault_a.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
            )?;
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_b.to_account_info(),
                        to: ctx.accounts.user_dest.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer,
                ),
                amount_out,
            )?;
        } else {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_source.to_account_info(),
                        to: ctx.accounts.vault_b.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
            )?;
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_a.to_account_info(),
                        to: ctx.accounts.user_dest.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer,
                ),
                amount_out,
            )?;
        }

        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
        Ok(())
    }
}

#[account]
pub struct Pool {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub bump: u8,
}

impl Pool {
    pub const LEN: usize = 8 + 32 * 4 + 1;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    #[account(
        init,
        payer = payer,
        space = Pool::LEN,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = payer,
        token::mint = mint_a,
        token::authority = pool,
    )]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        token::mint = mint_b,
        token::authority = pool,
    )]
    pub vault_b: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, address = pool.vault_a)]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(mut, address = pool.vault_b)]
    pub vault_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum MockDexError {
    #[msg("amount must be positive")]
    ZeroAmount,
    #[msg("pool has no liquidity")]
    EmptyPool,
    #[msg("arithmetic overflow")]
    Math,
    #[msg("slippage cap exceeded")]
    Slippage,
}
