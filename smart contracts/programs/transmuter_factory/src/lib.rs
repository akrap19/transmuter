use anchor_lang::prelude::*;

declare_id!("5D3y69mm4wrz7VcGsagfvnrMorvLar7ZnZaLfd3uVcfV");

/// Factory stub. `ping` keeps a BPF artefact until this program is implemented.
#[program]
pub mod transmuter_factory {
    use super::*;

    pub fn ping(_ctx: Context<Ping>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Ping {}
