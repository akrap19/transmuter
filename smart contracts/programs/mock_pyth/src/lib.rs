use anchor_lang::prelude::*;
use transmuter_constants::PYTH_SOL_USD_FEED_ID;

declare_id!("DyMTvcaqzXa5PjCqEyTf3FgWzQ2criPopM9ASXm9RVS5");

/// Minimal Pyth-shaped feed. Permissionless `set_price` so tests and the
/// keeper can warp price, confidence, and publish time.
#[program]
pub mod mock_pyth {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, expo: i32) -> Result<()> {
        let feed = &mut ctx.accounts.price_feed;
        feed.expo = expo;
        feed.price = 0;
        feed.conf = 0;
        feed.publish_time = 0;
        Ok(())
    }

    pub fn set_price(
        ctx: Context<SetPrice>,
        price: i64,
        conf: u64,
        publish_time: i64,
    ) -> Result<()> {
        let feed = &mut ctx.accounts.price_feed;
        feed.price = price;
        feed.conf = conf;
        feed.publish_time = publish_time;
        Ok(())
    }

    /// Write a PriceUpdateV2-shaped account (owner = mock_pyth) so snapshot_oracle
    /// exercises the real Pyth decoder without posting through the receiver.
    pub fn write_v2(
        ctx: Context<WriteV2>,
        price: i64,
        conf: u64,
        expo: i32,
        publish_time: i64,
    ) -> Result<()> {
        let mut data = ctx.accounts.price_update.try_borrow_mut_data()?;
        require!(data.len() >= 133, MockPythError::ShortAccount);
        for b in data.iter_mut() {
            *b = 0;
        }
        data[40] = 0x01; // VerificationLevel::Full after 8 disc + 32 write_authority
        let feed = PYTH_SOL_USD_FEED_ID;
        data[41..73].copy_from_slice(&feed);
        data[73..81].copy_from_slice(&price.to_le_bytes());
        data[81..89].copy_from_slice(&conf.to_le_bytes());
        data[89..93].copy_from_slice(&expo.to_le_bytes());
        data[93..101].copy_from_slice(&publish_time.to_le_bytes());
        data[101..109].copy_from_slice(&publish_time.to_le_bytes());
        data[109..117].copy_from_slice(&price.to_le_bytes());
        data[117..125].copy_from_slice(&conf.to_le_bytes());
        Ok(())
    }
}

#[account]
pub struct PriceFeed {
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
}

impl PriceFeed {
    pub const LEN: usize = 8 + 8 + 8 + 4 + 8;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = PriceFeed::LEN,
        seeds = [b"price_feed", payer.key().as_ref()],
        bump
    )]
    pub price_feed: Account<'info, PriceFeed>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(mut, seeds = [b"price_feed", owner.key().as_ref()], bump)]
    pub price_feed: Account<'info, PriceFeed>,
    /// CHECK: seed owner; anyone who knows the feed can crank set_price.
    pub owner: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct WriteV2<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: raw PriceUpdateV2 bytes; owner is this program.
    #[account(
        init_if_needed,
        payer = payer,
        space = 133,
        seeds = [b"price_v2", payer.key().as_ref()],
        bump
    )]
    pub price_update: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum MockPythError {
    #[msg("price_update account is shorter than PriceUpdateV2")]
    ShortAccount,
}
