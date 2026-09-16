use anchor_lang::prelude::*;

declare_id!("gA8y6oPQebWC2cNFgwKbJX9ivtWYpb6bf4pSJxkejfV");

/// Registry shim stub. `ping` keeps a BPF artefact until this program is implemented.
#[program]
pub mod transmuter_registry {
    use super::*;

    pub fn ping(_ctx: Context<Ping>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Ping {}
