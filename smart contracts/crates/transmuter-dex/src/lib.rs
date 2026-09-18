//! Raydium CPMM `swap_base_input` (USDC → WSOL) plus close-account unwrap.
//! convertTreasury uses this when `dex_program` is the public-devnet CPMM
//! id; localnet keeps the pinned mock_dex CPI.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};
use transmuter_constants::{MOCK_DEX_PROGRAM, RAYDIUM_CPMM_PROGRAM};

/// `sha256("global:swap_base_input")[..8]`
pub const SWAP_BASE_INPUT_DISC: [u8; 8] = [143, 190, 90, 218, 196, 30, 51, 222];
/// `sha256("global:initialize")[..8]`
pub const INITIALIZE_DISC: [u8; 8] = [175, 175, 109, 31, 13, 152, 155, 237];

pub const RAYDIUM_REMAINING: usize = 8;
/// Raydium `initialize` accounts after `creator`.
pub const RAYDIUM_INIT_REMAINING: usize = 19;

pub fn is_mock_dex(key: &Pubkey) -> bool {
    key == &Pubkey::from(MOCK_DEX_PROGRAM)
}

pub fn is_raydium_cpmm(key: &Pubkey) -> bool {
    key == &Pubkey::from(RAYDIUM_CPMM_PROGRAM)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DexError {
    BadVenue,
    MissingAccounts,
}

impl From<DexError> for ProgramError {
    fn from(e: DexError) -> Self {
        ProgramError::Custom(match e {
            DexError::BadVenue => 6000,
            DexError::MissingAccounts => 6001,
        })
    }
}

pub fn swap_usdc_to_wsol<'info>(
    raydium: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amm_config: AccountInfo<'info>,
    pool_state: AccountInfo<'info>,
    user_usdc: AccountInfo<'info>,
    user_wsol: AccountInfo<'info>,
    usdc_vault: AccountInfo<'info>,
    wsol_vault: AccountInfo<'info>,
    usdc_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    usdc_mint: AccountInfo<'info>,
    wsol_mint: AccountInfo<'info>,
    observation: AccountInfo<'info>,
    signer_seeds: &[&[u8]],
    amount_in: u64,
    min_out: u64,
) -> std::result::Result<(), ProgramError> {
    let mut data = Vec::with_capacity(8 + 16);
    data.extend_from_slice(&SWAP_BASE_INPUT_DISC);
    data.extend_from_slice(&amount_in.to_le_bytes());
    data.extend_from_slice(&min_out.to_le_bytes());

    let metas = vec![
        AccountMeta::new(payer.key(), true),
        AccountMeta::new_readonly(authority.key(), false),
        AccountMeta::new_readonly(amm_config.key(), false),
        AccountMeta::new(pool_state.key(), false),
        AccountMeta::new(user_usdc.key(), false),
        AccountMeta::new(user_wsol.key(), false),
        AccountMeta::new(usdc_vault.key(), false),
        AccountMeta::new(wsol_vault.key(), false),
        AccountMeta::new_readonly(usdc_program.key(), false),
        AccountMeta::new_readonly(token_program.key(), false),
        AccountMeta::new_readonly(usdc_mint.key(), false),
        AccountMeta::new_readonly(wsol_mint.key(), false),
        AccountMeta::new(observation.key(), false),
    ];
    let infos = vec![
        payer,
        authority,
        amm_config,
        pool_state,
        user_usdc,
        user_wsol,
        usdc_vault,
        wsol_vault,
        usdc_program,
        token_program,
        usdc_mint,
        wsol_mint,
        observation,
        raydium.clone(),
    ];
    invoke_signed(
        &Instruction {
            program_id: *raydium.key,
            accounts: metas,
            data,
        },
        &infos,
        &[signer_seeds],
    )?;
    Ok(())
}

pub fn close_wsol<'info>(
    token_program: AccountInfo<'info>,
    wsol_account: AccountInfo<'info>,
    dest: AccountInfo<'info>,
    owner: AccountInfo<'info>,
    signer_seeds: &[&[u8]],
) -> std::result::Result<(), ProgramError> {
    let ix = anchor_spl::token::spl_token::instruction::close_account(
        token_program.key,
        wsol_account.key,
        dest.key,
        owner.key,
        &[],
    )?;
    invoke_signed(
        &ix,
        &[wsol_account, dest, owner, token_program],
        &[signer_seeds],
    )?;
    Ok(())
}

/// Raydium CPMM `initialize`. `rem` is the 19 accounts after `creator`
/// (amm_config … rent), matching the on-chain instruction order.
pub fn initialize_cpmm_pool<'info>(
    raydium: AccountInfo<'info>,
    creator: AccountInfo<'info>,
    rem: &[AccountInfo<'info>],
    signer_seeds: &[&[u8]],
    amount0: u64,
    amount1: u64,
) -> std::result::Result<(), ProgramError> {
    if rem.len() < RAYDIUM_INIT_REMAINING {
        return Err(DexError::MissingAccounts.into());
    }
    let mut data = Vec::with_capacity(8 + 24);
    data.extend_from_slice(&INITIALIZE_DISC);
    data.extend_from_slice(&amount0.to_le_bytes());
    data.extend_from_slice(&amount1.to_le_bytes());
    data.extend_from_slice(&0u64.to_le_bytes());

    // Writable: creator, pool_state, lp_mint, creator_token_0/1, creator_lp,
    // vault_0/1, create_pool_fee, observation.
    let writable = [false, false, true, false, false, true, true, true, true, true, true, true, true, false, false, false, false, false, false];
    let mut metas = Vec::with_capacity(20);
    metas.push(AccountMeta::new(*creator.key, true));
    for (i, acc) in rem.iter().take(RAYDIUM_INIT_REMAINING).enumerate() {
        if writable[i] {
            metas.push(AccountMeta::new(*acc.key, false));
        } else {
            metas.push(AccountMeta::new_readonly(*acc.key, false));
        }
    }
    let mut infos = Vec::with_capacity(21);
    infos.push(creator);
    infos.extend(rem.iter().take(RAYDIUM_INIT_REMAINING).cloned());
    infos.push(raydium.clone());
    invoke_signed(
        &Instruction {
            program_id: *raydium.key,
            accounts: metas,
            data,
        },
        &infos,
        &[signer_seeds],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use transmuter_constants::{MOCK_DEX_PROGRAM, RAYDIUM_CPMM_PROGRAM};

    #[test]
    fn venue_ids_are_distinct_and_pinned() {
        assert!(is_mock_dex(&Pubkey::from(MOCK_DEX_PROGRAM)));
        assert!(is_raydium_cpmm(&Pubkey::from(RAYDIUM_CPMM_PROGRAM)));
        assert!(!is_raydium_cpmm(&Pubkey::from(MOCK_DEX_PROGRAM)));
        assert_ne!(MOCK_DEX_PROGRAM, RAYDIUM_CPMM_PROGRAM);
        assert_eq!(SWAP_BASE_INPUT_DISC[0], 143);
        assert_eq!(INITIALIZE_DISC[0], 175);
        assert_eq!(RAYDIUM_REMAINING, 8);
        assert_eq!(RAYDIUM_INIT_REMAINING, 19);
    }
}
