use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, CreateAccount};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount as SplTokenAccount},
    token_2022::Token2022,
    token_2022_extensions::{non_transferable_mint_initialize, NonTransferableMintInitialize},
    token_interface::{
        burn, initialize_mint2, mint_to, transfer_checked, Burn, InitializeMint2, Mint, MintTo,
        TokenAccount, TokenInterface, TransferChecked,
    },
};
use mock_dex::{self, cpi::accounts::Swap as DexSwap, program::MockDex, Pool};
use transmuter_constants::{MAX_COMPUTE_UNITS, NON_TRANSFERABLE_MINT_SPACE};

const _: () = assert!(MAX_COMPUTE_UNITS == 1_400_000);

declare_id!("pdESF2dhiihRkaMNiysseuiRwhy3VKR8ce7MFiomPv5");

/// Week-one proofs for the layout the cToken treasury will use:
/// Token-2022 mint with NonTransferable, mint/burn from a PDA-owned ATA,
/// freeze authority none.
///
/// TransferFeeConfig coexistence is proven from the TypeScript client
/// (a Token-2022 instruction, not a protocol instruction) so this program
/// does not link `spl-token-2022` and pick up its global allocator.
#[program]
pub mod token2022_probe {
    use super::*;

    pub fn init_non_transferable_mint(
        ctx: Context<InitNonTransferableMint>,
        decimals: u8,
    ) -> Result<()> {
        let space = NON_TRANSFERABLE_MINT_SPACE as u64;
        let lamports = Rent::get()?.minimum_balance(NON_TRANSFERABLE_MINT_SPACE);
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

        non_transferable_mint_initialize(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            NonTransferableMintInitialize {
                token_program_id: ctx.accounts.token_program.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
        ))?;

        initialize_mint2(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                InitializeMint2 {
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            decimals,
            &ctx.accounts.mint_authority.key(),
            None,
        )?;

        Ok(())
    }

    pub fn init_treasury(_ctx: Context<InitTreasury>) -> Result<()> {
        Ok(())
    }

    pub fn mint_to_treasury(ctx: Context<MintToTreasury>, amount: u64) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[
            b"mint_authority",
            mint_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        ctx.accounts.treasury.reload()?;
        Ok(())
    }

    pub fn burn_from_treasury(ctx: Context<BurnFromTreasury>, amount: u64) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[
            b"mint_authority",
            mint_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        ctx.accounts.treasury.reload()?;
        Ok(())
    }

    /// Must fail at the Token-2022 program: the mint_authority PDA signs, so
    /// this is not a missing-signer error. NonTransferable rejects the transfer.
    pub fn try_transfer_from_treasury(
        ctx: Context<TryTransferFromTreasury>,
        amount: u64,
        decimals: u8,
    ) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[
            b"mint_authority",
            mint_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.treasury.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
            decimals,
        )?;
        Ok(())
    }

    pub fn probe_finalize_compute(
        ctx: Context<ProbeFinalizeCompute>,
        amount_in: u64,
        min_out: u64,
    ) -> Result<()> {
        let dex_program = ctx.accounts.dex_program.to_account_info();
        mock_dex::cpi::swap(
            CpiContext::new(
                dex_program.clone(),
                DexSwap {
                    user: ctx.accounts.user.to_account_info(),
                    pool: ctx.accounts.pool.to_account_info(),
                    vault_a: ctx.accounts.vault_a.to_account_info(),
                    vault_b: ctx.accounts.vault_b.to_account_info(),
                    user_source: ctx.accounts.user_token_a.to_account_info(),
                    user_dest: ctx.accounts.user_token_b.to_account_info(),
                    mint_a: ctx.accounts.pool_mint_a.to_account_info(),
                    mint_b: ctx.accounts.pool_mint_b.to_account_info(),
                    token_program_a: ctx.accounts.spl_token_program.to_account_info(),
                    token_program_b: ctx.accounts.spl_token_program.to_account_info(),
                },
            ),
            amount_in,
            min_out,
            true,
        )?;
        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
        ctx.accounts.user_token_a.reload()?;
        ctx.accounts.user_token_b.reload()?;

        let second_in = ctx.accounts.user_token_b.amount;
        mock_dex::cpi::swap(
            CpiContext::new(
                dex_program,
                DexSwap {
                    user: ctx.accounts.user.to_account_info(),
                    pool: ctx.accounts.pool.to_account_info(),
                    vault_a: ctx.accounts.vault_a.to_account_info(),
                    vault_b: ctx.accounts.vault_b.to_account_info(),
                    user_source: ctx.accounts.user_token_b.to_account_info(),
                    user_dest: ctx.accounts.user_token_a.to_account_info(),
                    mint_a: ctx.accounts.pool_mint_a.to_account_info(),
                    mint_b: ctx.accounts.pool_mint_b.to_account_info(),
                    token_program_a: ctx.accounts.spl_token_program.to_account_info(),
                    token_program_b: ctx.accounts.spl_token_program.to_account_info(),
                },
            ),
            second_in,
            1,
            false,
        )?;
        ctx.accounts.vault_a.reload()?;
        ctx.accounts.vault_b.reload()?;
        ctx.accounts.user_token_a.reload()?;
        ctx.accounts.user_token_b.reload()?;

        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[
            b"mint_authority",
            mint_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_2022_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount_in,
        )?;
        ctx.accounts.treasury.reload()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitNonTransferableMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// New Token-2022 mint. Created in the handler so we control owner + space.
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: PDA mint authority. Freeze authority is None (S13).
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitTreasury<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: PDA that owns the treasury ATA.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = mint_authority,
        associated_token::token_program = token_program,
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintToTreasury<'info> {
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: PDA signer for mint.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct BurnFromTreasury<'info> {
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: PDA signer for burn.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct TryTransferFromTreasury<'info> {
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub destination: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: PDA that owns the treasury; signs the transfer CPI.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ProbeFinalizeCompute<'info> {
    pub user: Signer<'info>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: PDA mint authority.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vault_a: Account<'info, SplTokenAccount>,
    #[account(mut)]
    pub vault_b: Account<'info, SplTokenAccount>,
    #[account(mut)]
    pub user_token_a: Account<'info, SplTokenAccount>,
    #[account(mut)]
    pub user_token_b: Account<'info, SplTokenAccount>,
    /// CHECK: pool mint A (classic SPL in this probe).
    pub pool_mint_a: UncheckedAccount<'info>,
    /// CHECK: pool mint B.
    pub pool_mint_b: UncheckedAccount<'info>,
    pub dex_program: Program<'info, MockDex>,
    pub spl_token_program: Program<'info, Token>,
    pub token_2022_program: Program<'info, Token2022>,
}
