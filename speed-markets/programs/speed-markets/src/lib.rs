use anchor_lang::prelude::*;

use pyth_sdk_solana::load_price_feed_from_account_info;

use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer, TransferChecked};
use std::str;
use std::str::FromStr;

declare_id!("DSVREgjdfRaPTJ37MYBKyvZ3T1jzjjYZKDyTymvVacne");

const BTC_USDC_FEED: &str = "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J";
const ETH_USDC_FEED: &str = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw";
const SPEED_SEED: &[u8] = b"speedmarket";
const LIQUID_SEED: &[u8] = b"liquidity";
const MARKET_REQ_SEED: &[u8] = b"speedrequirements";

#[program]
mod speed_markets {
    use super::*;

    pub fn initialize_market_requirements(
        ctx: Context<InitializeSpeedMarketRequirements>,
        min_strike: i64,
        max_strike: i64,
        min_amount: u64,
        max_amount: u64,
        safe_box_impact: u64,
        lp_fee: u64,
        price_update_threshold: u64,
    ) -> Result<()> {
        let market_requirements = &mut ctx.accounts.market_requirements;
        market_requirements.min_strike_timestamp = min_strike;
        market_requirements.max_strike_timestamp = max_strike;
        market_requirements.min_amount = min_amount;
        market_requirements.max_amount = max_amount;
        market_requirements.safe_box_impact = safe_box_impact;
        market_requirements.lp_fee = lp_fee;
        market_requirements.price_update_threshold = price_update_threshold;
        market_requirements.liquidity_wallet = ctx.accounts.liquidity_wallet.key();
        market_requirements.liquid_bump = ctx.bumps.market_requirements;
        market_requirements.token_mint = ctx.accounts.token_mint.key();
        Ok(())
    }

    pub fn create_speed_market(
        ctx: Context<CreateSpeedMarket>,
        strike_time: i64,
        direction: u64,
        buy_in_amount: u64,
        strike_price: u64,
    ) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp;
        msg!("current timestamp {}", &current_timestamp);
        require!(strike_time > current_timestamp, Errors::StrikeTimeInThePast);
        require!(direction <= 1, Errors::DirectionError);
        require!(
            (strike_time - current_timestamp)
                >= ctx.accounts.market_requirements.min_strike_timestamp
                && (strike_time - current_timestamp)
                    <= ctx.accounts.market_requirements.max_strike_timestamp,
            Errors::MinMaxStrikeExceeded
        );

        require!(
            ctx.accounts.price_feed.key() == Pubkey::from_str(BTC_USDC_FEED).unwrap()
                || ctx.accounts.price_feed.key() == Pubkey::from_str(ETH_USDC_FEED).unwrap(),
            Errors::InvalidPriceFeed
        );

        // let price_account_info = &ctx.accounts.price_feed.to_account_info();
        let price_feed = load_price_feed_from_account_info( &ctx.accounts.price_feed.to_account_info() ).unwrap();
        let price_threshold = ctx.accounts.market_requirements.price_update_threshold;
        let current_price = price_feed
            .get_price_no_older_than(current_timestamp, price_threshold)
            .unwrap();
        require!(
            current_price.price > 0,
            Errors::InvalidPriceFeed
        );
        let speed_market = &mut ctx.accounts.speed_market;
        speed_market.user = ctx.accounts.user.key();
        speed_market.asset = ctx.accounts.price_feed.key();
        speed_market.token_mint = ctx.accounts.token_mint.key();
        speed_market.escrow_wallet = ctx.accounts.speed_market_wallet.key();
        speed_market.created_at = current_timestamp;
        speed_market.strike_time = strike_time;
        speed_market.strike_price = current_price.price;
        speed_market.direction = direction;
        speed_market.result = 0;
        speed_market.buy_in_amount = buy_in_amount;
        speed_market.safe_box_impact = ctx.accounts.market_requirements.safe_box_impact;
        speed_market.lp_fee = ctx.accounts.market_requirements.lp_fee;
        speed_market.resolved = false;
        speed_market.bump = ctx.bumps.speed_market;
        
        let display_price = u64::try_from(current_price.price).unwrap()
        / 10u64.pow(u32::try_from(-current_price.expo).unwrap());
        msg!("price {}", display_price);

        let mint_token = ctx.accounts.token_mint.key().clone();
        let user_from = ctx.accounts.user.key().clone();
        let strike_time_cloned = strike_time.to_le_bytes();
        let buy_in_amount_cloned = buy_in_amount.to_le_bytes();
        let direction_cloned = direction.to_le_bytes();
        let temp_bump = speed_market.bump.to_le_bytes();
        msg!("user {}", user_from);
        msg!("mint token {}", mint_token);

        let binding = &[
            SPEED_SEED.as_ref(),
            // user_from.as_ref(),
            buy_in_amount_cloned.as_ref(),
            strike_time_cloned.as_ref(),
            mint_token.as_ref(),
            temp_bump.as_ref(),
        ];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.speed_market_wallet.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ).with_signer(&[&binding[..]]),
            buy_in_amount,
        )?;

        Ok(())
    }

    pub fn resolve_speed_market(ctx: Context<ResolveSpeedMarket>) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp;
        msg!("passed the requirements {}", &current_timestamp);
        let winning_amount = ctx.accounts.speed_market.buy_in_amount / 2;
        let mint_token = ctx.accounts.token_mint.key().clone();
        let market_requirements = ctx.accounts.market_requirements.key().clone();
        let wallet_to_withdraw_from = ctx.accounts.wallet_to_withdraw_from.key().clone();
        let wallet_to_deposit_to = ctx.accounts.wallet_to_deposit_to.key().clone();
        let liquid_wallet = ctx.accounts.liquid_wallet.key().clone();
        let escrow_wallet = ctx.accounts.speed_market.escrow_wallet.clone();
        let direction_cloned = ctx.accounts.speed_market.direction.to_le_bytes();
        let strike_time_cloned = ctx.accounts.speed_market.strike_time.to_le_bytes();
        let buy_in_amount_cloned = ctx.accounts.speed_market.buy_in_amount.to_le_bytes();
        let temp_bump = ctx.accounts.speed_market.bump.to_le_bytes();
        let liquid_bump = ctx.accounts.market_requirements.liquid_bump.to_le_bytes();

        let price_account_info = &ctx.accounts.price_feed;
        let price_feed = load_price_feed_from_account_info( &price_account_info ).unwrap();
        let price_threshold = ctx.accounts.market_requirements.price_update_threshold;
        let current_price = price_feed
            .get_price_no_older_than(current_timestamp, price_threshold)
            .unwrap();
        
        let display_price = u64::try_from(current_price.price).unwrap()
        / 10u64.pow(u32::try_from(-current_price.expo).unwrap());
        msg!("price {}", display_price);

        msg!("market_requirements {}", market_requirements);
        msg!("mint token {}", mint_token);
        msg!("liquid_wallet {}", liquid_wallet);
        msg!("escrow_wallet {}", escrow_wallet);
        msg!("wallet_from {}", wallet_to_withdraw_from);
        msg!("wallet_to {}", wallet_to_deposit_to);

        let liquid_binding = &[
            MARKET_REQ_SEED.as_ref(),
            // user_admin.as_ref(),
            mint_token.as_ref(),
            liquid_bump.as_ref(),
        ];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.liquid_wallet.to_account_info(),
                    to: ctx.accounts.wallet_to_deposit_to.to_account_info(),
                    authority: ctx.accounts.market_requirements.to_account_info(),
                },
            ).with_signer(&[&liquid_binding[..]]),
            winning_amount,
        )?;

        let binding = &[
            SPEED_SEED.as_ref(),
            // user_from.as_ref(),
            buy_in_amount_cloned.as_ref(),
            strike_time_cloned.as_ref(),
            mint_token.as_ref(),
            temp_bump.as_ref(),
        ];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.wallet_to_deposit_to.to_account_info(),
                    authority: ctx.accounts.speed_market.to_account_info(),
                },
            ).with_signer(&[&binding[..]]),
            winning_amount,
        )?;

        msg!("winning amount {}", &winning_amount);
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
    DirectionError,
}

#[derive(Accounts)]
pub struct InitializeSpeedMarketRequirements<'info> {
    #[account(
        init,
        seeds = [
            MARKET_REQ_SEED.as_ref(),
            // user.key().as_ref(),
            token_mint.key().as_ref(),
            ],
            bump,
            payer = user,
            space = 8 + SpeedMarketRequirements::LEN
        )]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    #[account(
        init,
        payer = user,
        seeds=[
            // b"liquidity".as_ref(), 
            LIQUID_SEED.as_ref(),
            token_mint.key().as_ref(),
            ],
        bump,
        token::mint=token_mint,
        token::authority=market_requirements,
    )]
    pub liquidity_wallet: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(strike_time: i64, direction: u64, buy_in_amount: u64)]
pub struct CreateSpeedMarket<'info> {
    #[account(
        init,
        seeds = [
            b"speedmarket".as_ref(), 
            // user.key().as_ref(),
            buy_in_amount.to_le_bytes().as_ref(),
            strike_time.to_le_bytes().as_ref(),
            token_mint.key().as_ref(),
            ],
            bump,
            payer = user,
            space = 8 + SpeedMarket::LEN
        )]
    pub speed_market: Box<Account<'info, SpeedMarket>>,
    #[account(
        init,
        payer = user,
        seeds=[
            b"wallet".as_ref(), 
            buy_in_amount.to_le_bytes().as_ref(),
            strike_time.to_le_bytes().as_ref(),
            token_mint.key().as_ref(),
            ],
        bump,
        token::mint=token_mint,
        token::authority=speed_market,
    )]
    pub speed_market_wallet: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint=market_requirements.token_mint == token_mint.key(),
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint=wallet_to_withdraw_from.owner == user.key(),
        constraint=wallet_to_withdraw_from.mint == token_mint.key()
    )]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,

    // #[account(mut)]
    /// CHECK: checked in the implementation
    pub price_feed: AccountInfo<'info>,
    // #[account(mut)]
    // /// CHECK: checked in the implementation
    // pub price_feed: Account<'info, PriceFeed>,
    // pub price_feed: AccountInfo<'info,>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveSpeedMarket<'info> {
    #[account(mut)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    #[account(mut)]
    pub speed_market: Account<'info, SpeedMarket>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint=liquid_wallet.owner == market_requirements.key(),
        constraint=liquid_wallet.mint == token_mint.key()
    )]
    pub liquid_wallet: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint=wallet_to_withdraw_from.owner == speed_market.key(),
        constraint=wallet_to_withdraw_from.mint == token_mint.key()
    )]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint=wallet_to_deposit_to.owner == speed_market.user.key(),
        constraint=wallet_to_deposit_to.mint == token_mint.key()
    )]
    pub wallet_to_deposit_to: Account<'info, TokenAccount>,

    // #[account(mut)]
    /// CHECK: checked in the implementation
    pub price_feed: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct SpeedMarketRequirements {
    pub min_strike_timestamp: i64,
    pub max_strike_timestamp: i64,
    pub min_amount: u64,
    pub max_amount: u64,
    pub safe_box_impact: u64,
    pub lp_fee: u64,
    pub price_update_threshold: u64,
    pub liquidity_wallet: Pubkey,
    pub liquid_bump: u8,
    pub token_mint: Pubkey,
}

#[account]
pub struct SpeedMarket {
    pub bump: u8,
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub escrow_wallet: Pubkey,
    pub asset: Pubkey,
    pub strike_time: i64,
    pub strike_price: i64,
    pub final_price: i64,
    pub direction: u64,
    pub result: u8,
    pub buy_in_amount: u64,
    pub resolved: bool,
    pub safe_box_impact: u64,
    pub lp_fee: u64,
    pub created_at: i64,
}

impl SpeedMarket {
    const LEN: usize = 1 + (4 * 32) + (4 * 8) + 1 + 1 + 8 + 1 + (3 * 8);
}
impl SpeedMarketRequirements {
    const LEN: usize = 32 + (7 * 8) + 1 + 32;
}
