use anchor_lang::prelude::*;

declare_id!("EfscCNT9ERcPjNatjatcJRsuWLjqo5jSngbbS4Yim1i");

#[program]
mod speed_markets {
    use super::*;

    pub fn initialize_market_requirements(ctx: Context<InitializeSpeedMarketRequirements>, min_strike: i64, max_strike: i64, min_amount: u64, max_amount: u64) -> Result<()> {
        let market_requirements = &mut ctx.accounts.market_requirements;
        market_requirements.min_strike_timestamp = min_strike;
        market_requirements.max_strike_timestamp = max_strike;
        market_requirements.min_amount = min_amount;
        market_requirements.max_amount = max_amount;
        Ok(())
    }

    // pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, asset: str, strikeTime: u64, direction: u8, buyInAmount: u64, skewImpact: u64) -> Result<()> {
    pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, strike_time: i64, direction: u8) -> Result<()> {
        let bump = &[bump][..];
        let mut current_timestamp = Clock::get()?.unix_timestamp;
        msg!("current timestamp {}", &current_timestamp);
        require!(strike_time > current_timestamp, Errors::StrikeTimeInThePast);
        require!(direction <= 1 , Errors::DirectionError);
        require!((strike_time - current_timestamp) >= ctx.accounts.market_requirements.min_strike_timestamp && (strike_time - current_timestamp) <= ctx.accounts.market_requirements.max_strike_timestamp , Errors::MinMaxStrikeExceeded);
        // require!(strike_time <= max_strike, Errors::StrikeTimeInThePast);
        Ok(())
    }
    
}

#[error_code]
pub enum Errors {
    #[msg("Strike time lower than current time")]
    StrikeTimeInThePast,
    #[msg("Strike Min/Max time exceeded")]
    MinMaxStrikeExceeded,
    #[msg("Wrong direction. Up/Down only")]
    DirectionError
}

#[derive(Accounts)]
pub struct InitializeSpeedMarketRequirements<'info> {
    #[account(init, payer = user, space = 64 + 32)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSpeedMarket<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [
            b"speedmarket".as_ref(),
            user.key().as_ref()
            ],
            bump,
            payer = user,
            space = SpeedMarket::LEN
        )]
    pub speed_market: Account<'info, SpeedMarket>,
    
    #[account(mut)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    /// CHECK: only used as a signing PDA
    // pub authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SpeedMarketRequirements {
    pub min_strike_timestamp: i64,
    pub max_strike_timestamp: i64,
    pub min_amount: u64,
    pub max_amount: u64,
}

#[account]
pub struct SpeedMarket {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub strike_time: i64,
    pub strike_price: i64,
    pub final_price: i64,
    pub direction: u8,
    pub result: u8,
    pub buy_in_amount: u64,
    pub resolved: bool,
    pub safe_box_impact: u64,
    pub lp_fee: u64,
    pub created_at: i64,
}

impl SpeedMarket {
    const LEN: usize = 32 + 32 + (3 * 8) + 1 + 1 + 8 + 1 + (3 * 8);
}