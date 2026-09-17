use anchor_lang::prelude::*;
use transmuter_constants::ShimVoteResult;

declare_id!("gA8y6oPQebWC2cNFgwKbJX9ivtWYpb6bf4pSJxkejfV");

const MAX_FOUNDERS: usize = 7;

/// Registry stand-in. Config prefix is the cross-program interface (r22):
/// team, founders, founderThreshold, daoProgram, ambassadorCount,
/// maxAmbassadors, genesisLocked. Consumers stream-decode and ignore
/// trailing bytes. `ambassadorCount = 0` means quorum not met.
#[program]
pub mod transmuter_registry {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        team: Pubkey,
        founders: Vec<Pubkey>,
        founder_threshold: u8,
        dao_program: Pubkey,
        max_ambassadors: u32,
    ) -> Result<()> {
        require!(founders.len() <= MAX_FOUNDERS, RegistryError::TooManyFounders);
        require!(
            (founders.is_empty() && founder_threshold == 0)
                || (founder_threshold as usize >= 1 && (founder_threshold as usize) <= founders.len()),
            RegistryError::BadThreshold
        );
        ctx.accounts.config.set_inner(RegistryConfig {
            team,
            founders,
            founder_threshold,
            dao_program,
            ambassador_count: 0,
            max_ambassadors,
            genesis_locked: true,
            is_shim: true,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn is_ambassador(ctx: Context<ReadConfig>, _who: Pubkey) -> Result<bool> {
        // Zero seats: nobody is an ambassador. Never divide by this count.
        Ok(ctx.accounts.config.ambassador_count != 0)
    }

    pub fn get_ambassador_count(ctx: Context<ReadConfig>) -> Result<u32> {
        Ok(ctx.accounts.config.ambassador_count)
    }

    pub fn get_all_ambassadors(_ctx: Context<ReadConfig>) -> Result<Vec<Pubkey>> {
        Ok(Vec::new())
    }

    pub fn open_council_liquidation_vote(
        _ctx: Context<ReadConfig>,
        _proposal_id: [u8; 32],
        window_end: i64,
    ) -> Result<()> {
        require!(window_end > Clock::get()?.unix_timestamp, RegistryError::WindowEnd);
        Ok(())
    }

    pub fn get_council_liquidation_result(
        _ctx: Context<ReadConfig>,
        _proposal_id: [u8; 32],
    ) -> Result<VoteResult> {
        Ok(VoteResult::no_quorum())
    }
}

/// Same field order as DAO `VoteResult` / spec row 27.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct VoteResult {
    pub exists: bool,
    pub resolved: bool,
    pub passed: bool,
    pub yes_weight: u64,
    pub no_weight: u64,
    pub quorum_met: bool,
    pub closes_at: i64,
}

impl VoteResult {
    pub fn no_quorum() -> Self {
        let r = ShimVoteResult::NO_QUORUM;
        Self {
            exists: r.exists,
            resolved: r.resolved,
            passed: r.passed,
            yes_weight: r.yes_weight,
            no_weight: r.no_weight,
            quorum_met: r.quorum_met,
            closes_at: r.closes_at,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct RegistryConfig {
    pub team: Pubkey,
    #[max_len(7)]
    pub founders: Vec<Pubkey>,
    pub founder_threshold: u8,
    pub dao_program: Pubkey,
    pub ambassador_count: u32,
    pub max_ambassadors: u32,
    pub genesis_locked: bool,
    /// Shim-only. After the r22 prefix so consumers ignore it.
    pub is_shim: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + RegistryConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, RegistryConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReadConfig<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, RegistryConfig>,
}

#[error_code]
pub enum RegistryError {
    #[msg("too many founders")]
    TooManyFounders,
    #[msg("founder threshold does not match the founder set")]
    BadThreshold,
    #[msg("windowEnd must be an absolute unix timestamp in the future")]
    WindowEnd,
}
