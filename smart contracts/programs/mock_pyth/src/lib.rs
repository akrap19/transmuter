use anchor_lang::prelude::*;

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
