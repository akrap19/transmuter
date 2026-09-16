use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, CreateAccount};
use anchor_spl::{
    token_2022::Token2022,
    token_2022_extensions::{non_transferable_mint_initialize, NonTransferableMintInitialize},
    token_interface::{burn, initialize_mint2, mint_to, Burn, InitializeMint2, Mint, MintTo, TokenAccount},
};
use transmuter_constants::{
    premium_legs_sum_ok, MINT_PREMIUM_RATE_BPS, NON_TRANSFERABLE_MINT_SPACE,
    PROTOCOL_PREMIUM_RATE_BPS, UNDERLYING_PREMIUM_RATE_BPS,
};

mod math;
use math::{backing_per_token, base_lamports, bps_leg, tokens_to_mint};

declare_id!("GqWdDqeD8EJARnqtv1DKTBUStkGFR5stKRHmHMuuGru4");

/// cSOL: NonTransferable Token-2022 wrapper around SOL. Gold, age buckets,
/// transfer fees, and cToken EOL are out of scope for this program.
#[program]
pub mod transmuter_ctoken {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, decimals: u8) -> Result<()> {
        require!(premium_legs_sum_ok(), CTokenError::PremiumLegsMismatch);

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

        ctx.accounts.config.set_inner(Config {
            mint: ctx.accounts.mint.key(),
            factory: ctx.accounts.factory.key(),
            protocol_revenue_wallet: ctx.accounts.protocol_revenue_wallet.key(),
            mint_authority: ctx.accounts.mint_authority.key(),
            reserve: ctx.accounts.reserve.key(),
            revenue_pot: ctx.accounts.revenue_pot.key(),
            decimals,
            mint_premium_bps: MINT_PREMIUM_RATE_BPS,
            underlying_premium_bps: UNDERLYING_PREMIUM_RATE_BPS,
            protocol_premium_bps: PROTOCOL_PREMIUM_RATE_BPS,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn register_eol(ctx: Context<RegisterEol>, eol_id: Pubkey) -> Result<()> {
        ctx.accounts.eol_record.set_inner(RegisteredEol {
            config: ctx.accounts.config.key(),
            eol_id,
            authority: ctx.accounts.authority.key(),
            ctoken_treasury: ctx.accounts.ctoken_treasury.key(),
            bump: ctx.bumps.eol_record,
        });
        Ok(())
    }

    pub fn mint_for_treasury(ctx: Context<MintForTreasury>, underlying_amount: u64) -> Result<()> {
        require!(underlying_amount > 0, CTokenError::ZeroAmount);

        let decimals = ctx.accounts.config.decimals;
        let supply = ctx.accounts.mint.supply;
        let system_owned = ctx.accounts.authority.owner == &system_program::ID;
        // Wallet callers pay via System transfer. A program-owned EOL config
        // cannot be a System `from`; that caller credits `reserve` first and
        // this instruction prices against backing minus the credited amount.
        let backing_before = if system_owned {
            vault_backing(&ctx.accounts.reserve.to_account_info())?
        } else {
            let now = vault_backing(&ctx.accounts.reserve.to_account_info())?;
            require!(now >= underlying_amount, CTokenError::DepositMismatch);
            now.saturating_sub(underlying_amount)
        };
        let bpt = backing_per_token(backing_before, supply, decimals)?;
        let tokens = tokens_to_mint(
            underlying_amount,
            bpt,
            ctx.accounts.config.mint_premium_bps,
            decimals,
        )?;
        let base = base_lamports(tokens, bpt, decimals)?;
        require!(base <= underlying_amount, CTokenError::ArithmeticOverflow);
        let underlying_leg = bps_leg(base, ctx.accounts.config.underlying_premium_bps)?;
        let protocol_leg = bps_leg(base, ctx.accounts.config.protocol_premium_bps)?;

        if system_owned {
            let reserve_before = ctx.accounts.reserve.to_account_info().lamports();
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.authority.to_account_info(),
                        to: ctx.accounts.reserve.to_account_info(),
                    },
                ),
                underlying_amount,
            )?;
            let reserve_after = ctx.accounts.reserve.to_account_info().lamports();
            require!(
                reserve_after.saturating_sub(reserve_before) == underlying_amount,
                CTokenError::DepositMismatch
            );
        }

        send_lamports(
            &ctx.accounts.reserve.to_account_info(),
            &ctx.accounts.revenue_pot.to_account_info(),
            protocol_leg,
        )?;

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
                    to: ctx.accounts.ctoken_treasury.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            tokens,
        )?;
        ctx.accounts.mint.reload()?;
        ctx.accounts.ctoken_treasury.reload()?;

        let backing_after = vault_backing(&ctx.accounts.reserve.to_account_info())?;
        let bpt_after = backing_per_token(backing_after, ctx.accounts.mint.supply, decimals)?;
        require!(bpt_after >= bpt, CTokenError::BptFell);

        emit!(TreasuryMinted {
            caller: ctx.accounts.authority.key(),
            amount: underlying_amount,
            tokens_minted: tokens,
            base,
            underlying_premium: underlying_leg,
            protocol_premium: protocol_leg,
        });
        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        require!(amount > 0, CTokenError::ZeroAmount);

        let decimals = ctx.accounts.config.decimals;
        let supply = ctx.accounts.mint.supply;
        require!(amount <= supply, CTokenError::InsufficientBacking);
        let backing_before = vault_backing(&ctx.accounts.reserve.to_account_info())?;
        let bpt = backing_per_token(backing_before, supply, decimals)?;
        let payout = base_lamports(amount, bpt, decimals)?;
        require!(payout > 0, CTokenError::Dust);

        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.ctoken_treasury.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        ctx.accounts.mint.reload()?;
        ctx.accounts.ctoken_treasury.reload()?;

        send_lamports(
            &ctx.accounts.reserve.to_account_info(),
            &ctx.accounts.authority.to_account_info(),
            payout,
        )?;

        let remaining_supply = ctx.accounts.mint.supply;
        if remaining_supply > 0 {
            let backing_after = vault_backing(&ctx.accounts.reserve.to_account_info())?;
            let bpt_after = backing_per_token(backing_after, remaining_supply, decimals)?;
            require!(bpt_after >= bpt, CTokenError::BptFell);
        }

        emit!(RedemptionCompleted {
            caller: ctx.accounts.authority.key(),
            amount,
            payout,
        });
        Ok(())
    }

    pub fn flush_protocol_revenue(ctx: Context<FlushProtocolRevenue>) -> Result<()> {
        let excess = vault_backing(&ctx.accounts.revenue_pot.to_account_info())?;
        send_lamports(
            &ctx.accounts.revenue_pot.to_account_info(),
            &ctx.accounts.protocol_revenue_wallet.to_account_info(),
            excess,
        )?;
        Ok(())
    }
}

fn vault_backing(account: &AccountInfo) -> Result<u64> {
    let rent = Rent::get()?.minimum_balance(account.data_len());
    Ok(account.lamports().saturating_sub(rent))
}

fn send_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let rent = Rent::get()?.minimum_balance(from.data_len());
    require!(
        from.lamports().saturating_sub(rent) >= amount,
        CTokenError::InsufficientBacking
    );
    **from.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// New Token-2022 mint. Created in the handler so we control owner + space.
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK: PDA mint authority. Freeze authority is None (S13).
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = payer,
        space = 8 + SolVault::INIT_SPACE,
        seeds = [b"reserve", mint.key().as_ref()],
        bump
    )]
    pub reserve: Account<'info, SolVault>,
    #[account(
        init,
        payer = payer,
        space = 8 + SolVault::INIT_SPACE,
        seeds = [b"revenue", mint.key().as_ref()],
        bump
    )]
    pub revenue_pot: Account<'info, SolVault>,
    /// CHECK: snapshotted factory registrar; signs `register_eol` later.
    pub factory: UncheckedAccount<'info>,
    pub protocol_revenue_wallet: SystemAccount<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(eol_id: Pubkey)]
pub struct RegisterEol<'info> {
    #[account(mut)]
    pub factory: Signer<'info>,
    #[account(
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = factory
    )]
    pub config: Account<'info, Config>,
    /// CHECK: treasury authority of this EOL instance (Factory PDA later).
    pub authority: UncheckedAccount<'info>,
    #[account(constraint = ctoken_treasury.mint == config.mint)]
    pub ctoken_treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = factory,
        space = 8 + RegisteredEol::INIT_SPACE,
        seeds = [b"eol", config.key().as_ref(), eol_id.as_ref()],
        bump
    )]
    pub eol_record: Account<'info, RegisteredEol>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintForTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump,
        has_one = mint,
        has_one = reserve,
        has_one = revenue_pot
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"reserve", mint.key().as_ref()],
        bump
    )]
    pub reserve: Account<'info, SolVault>,
    #[account(
        mut,
        seeds = [b"revenue", mint.key().as_ref()],
        bump
    )]
    pub revenue_pot: Account<'info, SolVault>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: PDA signer for mint.
    #[account(
        seeds = [b"mint_authority", mint.key().as_ref()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = authority,
        token::token_program = token_program
    )]
    pub ctoken_treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [b"eol", config.key().as_ref(), eol_record.eol_id.as_ref()],
        bump = eol_record.bump,
        has_one = authority,
        has_one = ctoken_treasury,
        constraint = eol_record.config == config.key() @ CTokenError::UnregisteredEol
    )]
    pub eol_record: Account<'info, RegisteredEol>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"config", mint.key().as_ref()],
        bump = config.bump,
        has_one = mint,
        has_one = reserve
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"reserve", mint.key().as_ref()],
        bump
    )]
    pub reserve: Account<'info, SolVault>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: mint-authority PDA layout; burn is signed by `authority`.
    #[account(seeds = [b"mint_authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = authority,
        token::token_program = token_program
    )]
    pub ctoken_treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(
        seeds = [b"eol", config.key().as_ref(), eol_record.eol_id.as_ref()],
        bump = eol_record.bump,
        has_one = authority,
        has_one = ctoken_treasury,
        constraint = eol_record.config == config.key() @ CTokenError::UnregisteredEol
    )]
    pub eol_record: Account<'info, RegisteredEol>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FlushProtocolRevenue<'info> {
    #[account(
        seeds = [b"config", config.mint.as_ref()],
        bump = config.bump,
        has_one = revenue_pot,
        has_one = protocol_revenue_wallet
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"revenue", config.mint.as_ref()],
        bump
    )]
    pub revenue_pot: Account<'info, SolVault>,
    #[account(mut)]
    pub protocol_revenue_wallet: SystemAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub mint: Pubkey,
    pub factory: Pubkey,
    pub protocol_revenue_wallet: Pubkey,
    pub mint_authority: Pubkey,
    pub reserve: Pubkey,
    pub revenue_pot: Pubkey,
    pub decimals: u8,
    pub mint_premium_bps: u64,
    pub underlying_premium_bps: u64,
    pub protocol_premium_bps: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SolVault {}

#[account]
#[derive(InitSpace)]
pub struct RegisteredEol {
    pub config: Pubkey,
    pub eol_id: Pubkey,
    pub authority: Pubkey,
    pub ctoken_treasury: Pubkey,
    pub bump: u8,
}

#[event]
pub struct TreasuryMinted {
    pub caller: Pubkey,
    pub amount: u64,
    pub tokens_minted: u64,
    pub base: u64,
    pub underlying_premium: u64,
    pub protocol_premium: u64,
}

#[event]
pub struct RedemptionCompleted {
    pub caller: Pubkey,
    pub amount: u64,
    pub payout: u64,
}

#[error_code]
pub enum CTokenError {
    #[msg("premium legs must sum exactly to mintPremiumRate")]
    PremiumLegsMismatch,
    #[msg("deposit too small to mint a single unit")]
    Dust,
    #[msg("amount must be greater than zero")]
    ZeroAmount,
    #[msg("reserve cannot cover this redemption")]
    InsufficientBacking,
    #[msg("caller is not a registered EOL Token of this cToken")]
    UnregisteredEol,
    #[msg("backing-per-token would fall")]
    BptFell,
    #[msg("arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("lamports received did not match underlyingAmount")]
    DepositMismatch,
}
