use anchor_lang::prelude::*;

declare_id!("DUYcHygp6rTdf3XY49ewhEyzpUg2QEfWECPTu5ucpaXJ");

/// EOL Token stub. `ping` keeps a BPF artefact until this program is implemented.
#[program]
pub mod transmuter_eol_token {
    use super::*;

    pub fn ping(_ctx: Context<Ping>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Ping {}
