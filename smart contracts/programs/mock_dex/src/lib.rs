use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, Transfer, TransferChecked,
};

declare_id!("B1Wxrd67VBAmBKKvwx41YZjgpJDfJWmJHyXfHCBfrqdV");

/// Constant-product pool. One pool per mint pair. Vaults may be classic SPL
/// or Token-2022 so an EOL/USDC pool can mix programs. Slippage is min_out (SH2).
#[program]
pub mod mock_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.mint_a = ctx.accounts.mint_a.key();
        pool.mint_b = ctx.accounts.mint_b.key();
        pool.vault_a = ctx.accounts.vault_a.key();
        pool.vault_b = ctx.accounts.vault_b.key();
        pool.withdraw_authority = ctx.accounts.withdraw_authority.key();
        pool.decimals_a = ctx.accounts.mint_a.decimals;
        pool.decimals_b = ctx.accounts.mint_b.decimals;
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
        require!(amount_a > 0 && amount_b > 0, MockDexError::ZeroAmount);
        checked_transfer(
            ctx.accounts.token_program_a.to_account_info(),
            ctx.accounts.user_a.to_account_info(),
            ctx.accounts.mint_a.to_account_info(),
            ctx.accounts.vault_a.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount_a,
            ctx.accounts.pool.decimals_a,
            None,
        )?;
        checked_transfer(
            ctx.accounts.token_program_b.to_account_info(),
            ctx.accounts.user_b.to_account_info(),
            ctx.accounts.mint_b.to_account_info(),
            ctx.accounts.vault_b.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount_b,
            ctx.accounts.pool.decimals_b,
            None,
        )?;
        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
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

        let amount_out = (reserve_out as u128)
            .checked_mul(amount_in as u128)
            .ok_or(MockDexError::Math)?
            .checked_div(
                (reserve_in as u128)
                    .checked_add(amount_in as u128)
                    .ok_or(MockDexError::Math)?,
            )
            .ok_or(MockDexError::Math)? as u64;
        require!(amount_out >= min_out, MockDexError::Slippage);

        let bump = ctx.accounts.pool.bump;
        let mint_a = ctx.accounts.pool.mint_a;
        let mint_b = ctx.accounts.pool.mint_b;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"pool", mint_a.as_ref(), mint_b.as_ref(), &bump_seed];
        let signer = &[seeds];

        if a_to_b {
            checked_transfer(
                ctx.accounts.token_program_a.to_account_info(),
                ctx.accounts.user_source.to_account_info(),
                ctx.accounts.mint_a.to_account_info(),
                ctx.accounts.vault_a.to_account_info(),
                ctx.accounts.user.to_account_info(),
                amount_in,
                ctx.accounts.pool.decimals_a,
                None,
            )?;
            checked_transfer(
                ctx.accounts.token_program_b.to_account_info(),
                ctx.accounts.vault_b.to_account_info(),
                ctx.accounts.mint_b.to_account_info(),
                ctx.accounts.user_dest.to_account_info(),
                ctx.accounts.pool.to_account_info(),
                amount_out,
                ctx.accounts.pool.decimals_b,
                Some(signer),
            )?;
        } else {
            checked_transfer(
                ctx.accounts.token_program_b.to_account_info(),
                ctx.accounts.user_source.to_account_info(),
                ctx.accounts.mint_b.to_account_info(),
                ctx.accounts.vault_b.to_account_info(),
                ctx.accounts.user.to_account_info(),
                amount_in,
                ctx.accounts.pool.decimals_b,
                None,
            )?;
            checked_transfer(
                ctx.accounts.token_program_a.to_account_info(),
                ctx.accounts.vault_a.to_account_info(),
                ctx.accounts.mint_a.to_account_info(),
                ctx.accounts.user_dest.to_account_info(),
                ctx.accounts.pool.to_account_info(),
                amount_out,
                ctx.accounts.pool.decimals_a,
                Some(signer),
            )?;
        }

        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
        Ok(())
    }

    pub fn initialize_native(ctx: Context<InitializeNative>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.usdc_mint = ctx.accounts.usdc_mint.key();
        pool.vault_usdc = ctx.accounts.vault_usdc.key();
        pool.withdraw_authority = ctx.accounts.withdraw_authority.key();
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    /// USDC in, lamports out from the pool account. Constant-product against
    /// (vault_usdc, pool.lamports - rent).
    pub fn swap_to_sol(ctx: Context<SwapToSol>, amount_in: u64, min_out: u64) -> Result<()> {
        require!(amount_in > 0, MockDexError::ZeroAmount);
        let rent = Rent::get()?.minimum_balance(ctx.accounts.pool.to_account_info().data_len());
        let sol_reserve = ctx
            .accounts
            .pool
            .to_account_info()
            .lamports()
            .saturating_sub(rent);
        let usdc_reserve = ctx.accounts.vault_usdc.amount;
        require!(sol_reserve > 0 && usdc_reserve > 0, MockDexError::EmptyPool);
        let amount_out = (sol_reserve as u128)
            .checked_mul(amount_in as u128)
            .ok_or(MockDexError::Math)?
            .checked_div(
                (usdc_reserve as u128)
                    .checked_add(amount_in as u128)
                    .ok_or(MockDexError::Math)?,
            )
            .ok_or(MockDexError::Math)? as u64;
        require!(amount_out >= min_out, MockDexError::Slippage);
        token_interface::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;
        let pool_info = ctx.accounts.pool.to_account_info();
        let dest = ctx.accounts.sol_dest.to_account_info();
        **pool_info.try_borrow_mut_lamports()? -= amount_out;
        **dest.try_borrow_mut_lamports()? += amount_out;
        ctx.accounts.vault_usdc.reload()?;
        Ok(())
    }

    /// Protocol unwind: send the current vault balances to the caller.
    pub fn withdraw_all(ctx: Context<WithdrawAll>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.pool.withdraw_authority,
            MockDexError::Unauthorized
        );
        let amount_a = ctx.accounts.vault_a.amount;
        let amount_b = ctx.accounts.vault_b.amount;
        let bump = ctx.accounts.pool.bump;
        let mint_a = ctx.accounts.pool.mint_a;
        let mint_b = ctx.accounts.pool.mint_b;
        let bump_seed = [bump];
        let seeds: &[&[u8]] = &[b"pool", mint_a.as_ref(), mint_b.as_ref(), &bump_seed];
        if amount_a > 0 {
            checked_transfer(
                ctx.accounts.token_program_a.to_account_info(),
                ctx.accounts.vault_a.to_account_info(),
                ctx.accounts.mint_a.to_account_info(),
                ctx.accounts.dest_a.to_account_info(),
                ctx.accounts.pool.to_account_info(),
                amount_a,
                ctx.accounts.pool.decimals_a,
                Some(&[seeds]),
            )?;
        }
        if amount_b > 0 {
            checked_transfer(
                ctx.accounts.token_program_b.to_account_info(),
                ctx.accounts.vault_b.to_account_info(),
                ctx.accounts.mint_b.to_account_info(),
                ctx.accounts.dest_b.to_account_info(),
                ctx.accounts.pool.to_account_info(),
                amount_b,
                ctx.accounts.pool.decimals_b,
                Some(&[seeds]),
            )?;
        }
        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
        Ok(())
    }
}

fn checked_transfer<'info>(
    program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let accounts = TransferChecked {
        from,
        mint,
        to,
        authority,
    };
    if let Some(s) = signer {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(program, accounts, s),
            amount,
            decimals,
        )
    } else {
        token_interface::transfer_checked(CpiContext::new(program, accounts), amount, decimals)
    }
}

#[account]
pub struct Pool {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub withdraw_authority: Pubkey,
    pub decimals_a: u8,
    pub decimals_b: u8,
    pub bump: u8,
}

impl Pool {
    pub const LEN: usize = 8 + 32 * 5 + 1 + 1 + 1;
}

#[account]
pub struct NativePool {
    pub usdc_mint: Pubkey,
    pub vault_usdc: Pubkey,
    pub withdraw_authority: Pubkey,
    pub bump: u8,
}

impl NativePool {
    pub const LEN: usize = 8 + 32 * 3 + 1;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: who may unwind this pool (EOL config PDA).
    pub withdraw_authority: UncheckedAccount<'info>,
    pub mint_a: InterfaceAccount<'info, Mint>,
    pub mint_b: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = payer,
        space = Pool::LEN,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = payer,
        token::mint = mint_a,
        token::authority = pool,
        token::token_program = token_program_a,
    )]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        token::mint = mint_b,
        token::authority = pool,
        token::token_program = token_program_b,
    )]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    pub user: Signer<'info>,
    #[account(
        seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut, address = pool.vault_a)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = pool.vault_b)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_b: InterfaceAccount<'info, TokenAccount>,
    #[account(address = pool.mint_a)]
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(address = pool.mint_b)]
    pub mint_b: InterfaceAccount<'info, Mint>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    pub user: Signer<'info>,
    #[account(
        seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut, address = pool.vault_a)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = pool.vault_b)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_source: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_dest: InterfaceAccount<'info, TokenAccount>,
    #[account(address = pool.mint_a)]
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(address = pool.mint_b)]
    pub mint_b: InterfaceAccount<'info, Mint>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct WithdrawAll<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"pool", pool.mint_a.as_ref(), pool.mint_b.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut, address = pool.vault_a)]
    pub vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = pool.vault_b)]
    pub vault_b: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub dest_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub dest_b: InterfaceAccount<'info, TokenAccount>,
    #[account(address = pool.mint_a)]
    pub mint_a: InterfaceAccount<'info, Mint>,
    #[account(address = pool.mint_b)]
    pub mint_b: InterfaceAccount<'info, Mint>,
    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct InitializeNative<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: who may unwind (unused for native; kept for symmetry).
    pub withdraw_authority: UncheckedAccount<'info>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = payer,
        space = NativePool::LEN,
        seeds = [b"native", usdc_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, NativePool>,
    #[account(
        init,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = pool,
        token::token_program = token_program,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SwapToSol<'info> {
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"native", pool.usdc_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, NativePool>,
    #[account(mut, address = pool.vault_usdc)]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: lamport destination (EOL config PDA).
    #[account(mut)]
    pub sol_dest: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
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
    #[msg("caller is not the pool withdraw authority")]
    Unauthorized,
}
