use anchor_lang::prelude::*;

declare_id!("6obevHvyADNmvyysyj8QBfgUQUbbhZU4CvMtghbRHw3W");

/// DAO shim stub. `ping` keeps a BPF artefact until this program is implemented.
#[program]
pub mod transmuter_dao {
    use super::*;

    pub fn ping(_ctx: Context<Ping>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Ping {}
