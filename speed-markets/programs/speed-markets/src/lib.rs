use anchor_lang::prelude::*;
use std::str::FromStr;
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer};

declare_id!("EfscCNT9ERcPjNatjatcJRsuWLjqo5jSngbbS4Yim1i");

const BTC_USDC_FEED: &str = "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J";
const ETH_USDC_FEED: &str = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw";

#[program]
mod speed_markets {
    use super::*;

    pub fn initialize_market_requirements(ctx: Context<InitializeSpeedMarketRequirements>, min_strike: i64, max_strike: i64, min_amount: u64, max_amount: u64, safe_box_impact: u64) -> Result<()> {
        let market_requirements = &mut ctx.accounts.market_requirements;
        market_requirements.min_strike_timestamp = min_strike;
        market_requirements.max_strike_timestamp = max_strike;
        market_requirements.min_amount = min_amount;
        market_requirements.max_amount = max_amount;
        market_requirements.safe_box_impact = safe_box_impact;
        Ok(())
    }

    // pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, asset: str, strikeTime: u64, direction: u8, buyInAmount: u64, skewImpact: u64) -> Result<()> {
    pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, strike_time: i64, direction: u8, buy_in_amount: u64) -> Result<()> {
        let bump = &[bump][..];
        let mut current_timestamp = Clock::get()?.unix_timestamp;
        msg!("current timestamp {}", &current_timestamp);
        require!(strike_time > current_timestamp, Errors::StrikeTimeInThePast);
        require!(direction <= 1 , Errors::DirectionError);
        require!((strike_time - current_timestamp) >= ctx.accounts.market_requirements.min_strike_timestamp && (strike_time - current_timestamp) <= ctx.accounts.market_requirements.max_strike_timestamp , Errors::MinMaxStrikeExceeded);
        // require!(strike_time <= max_strike, Errors::StrikeTimeInThePast);
        let speed_market = &mut ctx.accounts.speed_market;
        speed_market.created_at = current_timestamp;
        speed_market.strike_time = strike_time;
        speed_market.strike_price = 0;
        speed_market.direction = direction;
        speed_market.result = 0;
        speed_market.buy_in_amount = buy_in_amount;
        speed_market.safe_box_impact = 5;
        speed_market.lp_fee = 5;
        speed_market.resolved = false;
        // require!(speed_market.user.key() == Pubkey::from_str(BTC_USDC_FEED).unwrap() , Errors::DirectionError);
        require!(ctx.accounts.price_feed.key() == Pubkey::from_str(BTC_USDC_FEED).unwrap() || ctx.accounts.price_feed.key() == Pubkey::from_str(ETH_USDC_FEED).unwrap() , Errors::InvalidPriceFeed);
        speed_market.user = ctx.accounts.user.key();

        let destination = &ctx.accounts.to_ata;
        let source = &ctx.accounts.from_ata;
        let token_program = &ctx.accounts.token_program;
        let authority = &ctx.accounts.from;

        // Transfer tokens from taker to initializer
        let cpi_accounts = SplTransfer {
            from: source.to_account_info().clone(),
            to: destination.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        
        token::transfer(
            CpiContext::new(cpi_program, cpi_accounts),
            buy_in_amount)?;

        Ok(())
    }
    
}

#[error_code]
pub enum Errors {
    #[msg("Invalid price feed")]
    InvalidPriceFeed,
    #[msg("Strike time lower than current time")]
    StrikeTimeInThePast,
    #[msg("Strike Min/Max time exceeded")]
    MinMaxStrikeExceeded,
    #[msg("Wrong direction. Up/Down only")]
    DirectionError
}

#[derive(Accounts)]
pub struct InitializeSpeedMarketRequirements<'info> {
    #[account(init, payer = user, space = 64 + 40)]
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
            b"speed".as_ref(),
            user.key().as_ref()
            ],
            bump,
            payer = user,
            space = 8 + SpeedMarket::LEN
        )]
    pub speed_market: Account<'info, SpeedMarket>,
    
    #[account(mut)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    #[account(mut)]
    /// CHECK: checked in the implementation
    pub price_feed: AccountInfo<'info>,
    /// CHECK: only used as a signing PDA
    // pub authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,

    pub from: Signer<'info>,
    #[account(mut)]
    pub from_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}


#[account]
pub struct SpeedMarketRequirements {
    pub min_strike_timestamp: i64,
    pub max_strike_timestamp: i64,
    pub min_amount: u64,
    pub max_amount: u64,
    pub safe_box_impact: u64,
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