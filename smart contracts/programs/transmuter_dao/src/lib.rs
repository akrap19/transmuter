use anchor_lang::prelude::*;
use transmuter_constants::{community_vote_type, ShimVoteResult};

declare_id!("6obevHvyADNmvyysyj8QBfgUQUbbhZU4CvMtghbRHw3W");

/// DAO stand-in. `getCommunityVoteResult` always reports exists=true,
/// quorumMet=false so a missing result cannot be read as consent.
#[program]
pub mod transmuter_dao {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.config.set_inner(DaoConfig {
            is_shim: true,
            bump: ctx.bumps.config,
        });
        Ok(())
    }

    pub fn open_community_vote(
        _ctx: Context<ReadConfig>,
        _proposal_id: [u8; 32],
        vote_type: u8,
        window_end: i64,
    ) -> Result<()> {
        require!(community_vote_type(vote_type), DaoError::WrongVoteType);
        require!(window_end > Clock::get()?.unix_timestamp, DaoError::WindowEnd);
        Ok(())
    }

    pub fn get_community_vote_result(
        _ctx: Context<ReadConfig>,
        _proposal_id: [u8; 32],
    ) -> Result<VoteResult> {
        Ok(VoteResult::no_quorum())
    }
}

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
pub struct DaoConfig {
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
        space = 8 + DaoConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, DaoConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReadConfig<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, DaoConfig>,
}

#[error_code]
pub enum DaoError {
    #[msg("windowEnd must be an absolute unix timestamp in the future")]
    WindowEnd,
    #[msg("openCommunityVote does not serve this vote type")]
    WrongVoteType,
}
