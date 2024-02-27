use anchor_lang::prelude::*;
use std::str::FromStr;
use std::str;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, TransferChecked, Transfer};

declare_id!("EfscCNT9ERcPjNatjatcJRsuWLjqo5jSngbbS4Yim1i");

const BTC_USDC_FEED: &str = "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J";
const ETH_USDC_FEED: &str = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw";
const SPEED_SEED: &[u8] = b"speed";

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
    pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, wallet_bump: u8, strike_time: i64, direction: u8, buy_in_amount: u64) -> Result<()> {
        let bump = &[bump][..];
        let wallet_bump = &[wallet_bump][..];
        let current_timestamp = Clock::get()?.unix_timestamp;
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
        speed_market.token_mint = ctx.accounts.token_mint.key();
        speed_market.escrow_wallet = ctx.accounts.speed_market_wallet.key();
        speed_market.bump = *ctx.bumps.get("speed_market").unwrap();
        // require!(speed_market.user.key() == Pubkey::from_str(BTC_USDC_FEED).unwrap() , Errors::DirectionError);
        require!(ctx.accounts.price_feed.key() == Pubkey::from_str(BTC_USDC_FEED).unwrap() || ctx.accounts.price_feed.key() == Pubkey::from_str(ETH_USDC_FEED).unwrap() , Errors::InvalidPriceFeed);
        speed_market.user = ctx.accounts.user.key();
        let mint_token = ctx.accounts.token_mint.key().clone();
        let user_from = ctx.accounts.user.key().clone();
        let strike_time_cloned = strike_time.to_le_bytes();
        let buy_in_amount_cloned = buy_in_amount.to_le_bytes();
        let direction_cloned = direction.to_le_bytes();
        let temp_bump = speed_market.bump.to_le_bytes();
        msg!("user {}", user_from);
        msg!("mint token {}", mint_token);
        // msg!("direction {}", str::from_utf8(direction_cloned.as_ref()).unwrap());
        // msg!("bump {}", str::from_utf8(temp_bump.as_ref()).unwrap());

        let binding = &[
                    SPEED_SEED.as_ref(), 
                    user_from.as_ref(),
                    mint_token.as_ref(),
                    direction_cloned.as_ref(),
                    temp_bump.as_ref()
                    ];
        let inner = vec![
            b"speed".as_ref(),
            user_from.as_ref(),
            mint_token.as_ref(),
            direction_cloned.as_ref(),
            temp_bump.as_ref()
            // strike_time_cloned.as_ref(),
            // buy_in_amount_cloned.as_ref(),
            // &[speed_market.bump][..]
            // &[*ctx.bumps.get("speed_market").unwrap()]
        ];
        let outer = vec![inner.as_slice()];
        
        // let transfer_instruction = Transfer{
        //     from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
        //     to: ctx.accounts.speed_market_wallet.to_account_info(),
        //     authority: ctx.accounts.user.to_account_info(),
        // };
        
        // let cpi_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info(),
        //     transfer_instruction,
        //     // outer.as_slice(),
        //     &[binding.as_ref()],
        //     // &[&[SPEED_SEED.as_ref(), &[bumps.to_le_bytes()[0]]]],
        // );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.speed_market_wallet.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            )
            .with_signer(&[&binding[..]]),
            // .with_signer(outer.as_slice()),
            buy_in_amount,
        )?;
    

        msg!("Before sending tx");
        msg!("Buy in amount: \n{}", &buy_in_amount);
        // msg!("Cpi context: \n{:#?}", &ctx.accounts.speed_market_wallet.to_account_info());
        // anchor_spl::token::transfer(cpi_ctx, buy_in_amount)?;
        Ok(())
    }
    
    pub fn resolve_speed_market(ctx: Context<ResolveSpeedMarket>, bump: u8 ) -> Result<()> {
        let bump = &[bump][..];
        let current_timestamp = Clock::get()?.unix_timestamp;
        msg!("passed the requirements {}", &current_timestamp);
        let winning_amount = ctx.accounts.speed_market.buy_in_amount/2;
        let mint_token = ctx.accounts.token_mint.key().clone();
        let user_from = ctx.accounts.user.key().clone();
        let wallet_to_withdraw_from = ctx.accounts.wallet_to_withdraw_from.key().clone();
        let wallet_to_deposit_to = ctx.accounts.wallet_to_deposit_to.key().clone();
        let escrow_wallet = ctx.accounts.speed_market.escrow_wallet.clone();
        let direction_cloned = ctx.accounts.speed_market.direction.to_le_bytes();
        let temp_bump = ctx.accounts.speed_market.bump.to_le_bytes();

        // let inner = vec![
        //     b"speed".as_ref(),
        //     user_from.as_ref(),
        //     mint_token.as_ref(),
        //     wallet_to_withdraw_from.as_ref(),
        //     wallet_to_deposit_to.as_ref(),
        // ];
        // let outer = vec![inner.as_slice()];
        // let transfer_instruction = Transfer{
        //     from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
        //     to: ctx.accounts.wallet_to_deposit_to.to_account_info(),
        //     authority: ctx.accounts.speed_market.to_account_info(),
        // };
        
        // let cpi_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info(),
        //     transfer_instruction,
        //     outer.as_slice(),
        // );

        msg!("user {}", user_from);
        msg!("mint token {}", mint_token);
        msg!("escrow_wallet {}", escrow_wallet);
        msg!("wallet_from {}", wallet_to_withdraw_from);
        msg!("wallet_to {}", wallet_to_deposit_to);
        // msg!("direction {}", str::from_utf8(&direction_cloned).unwrap());
        // msg!("bump {}", str::from_utf8(&temp_bump).unwrap());


        let binding = &[
                    SPEED_SEED.as_ref(), 
                    user_from.as_ref(),
                    mint_token.as_ref(),
                    direction_cloned.as_ref(),
                    temp_bump.as_ref()
                    ];

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.wallet_to_withdraw_from.to_account_info(),
                    to: ctx.accounts.wallet_to_deposit_to.to_account_info(),
                    authority: ctx.accounts.speed_market.to_account_info(),
                },
            )
            .with_signer(&[&binding[..]]),
            // .with_signer(outer.as_slice()),
            winning_amount,
        )?;
        
        
        msg!("winning amount {}", &winning_amount);
        // msg!("winning amount {}", &ctx.accounts.speed_market.to_account_info());
        // msg!("outer {}", &outer.as_slice());
        // anchor_spl::token::transfer(cpi_ctx, winning_amount)?;
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
#[instruction(strike_time: i64, direction: u8, buy_in_amount: u64)]
pub struct CreateSpeedMarket<'info> {
    #[account(
        init,
        seeds = [
            b"speed".as_ref(),
            user.key().as_ref(),
            token_mint.key().as_ref(),
            direction.to_le_bytes().as_ref(),
            // strike_time.to_le_bytes().as_ref(),
            // buy_in_amount.to_be_bytes().as_ref(),
            ],
            bump,
            payer = user,
            space = 8 + SpeedMarket::LEN
        )]
    pub speed_market: Account<'info, SpeedMarket>,
    #[account(
        init,
        payer = user,
        seeds=[
            b"wallet".as_ref(), 
            user.key().as_ref(),
            token_mint.key().as_ref(),
            direction.to_le_bytes().as_ref(),
            // strike_time.to_le_bytes().as_ref(),
            // buy_in_amount.to_le_bytes().as_ref(),
            ],
        bump,
        token::mint=token_mint,
        token::authority=speed_market,
    )]
    pub speed_market_wallet: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint=wallet_to_withdraw_from.owner == user.key(),
        constraint=wallet_to_withdraw_from.mint == token_mint.key()
    )]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub market_requirements: Account<'info, SpeedMarketRequirements>,
    #[account(mut)]
    /// CHECK: checked in the implementation
    pub price_feed: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ResolveSpeedMarket<'info> {
    #[account(mut)]
    pub speed_market: Account<'info, SpeedMarket>,
    
    #[account(mut)]
    pub user: Signer<'info>,

    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint=wallet_to_withdraw_from.owner == speed_market.key(),
        constraint=wallet_to_withdraw_from.mint == token_mint.key()
    )]
    pub wallet_to_withdraw_from: Account<'info, TokenAccount>,

    #[account(
        mut,
        // constraint=wallet_to_deposit_to.owner == speed_market.user.key(),
        constraint=wallet_to_deposit_to.mint == token_mint.key()
    )]
    pub wallet_to_deposit_to: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
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
    pub bump: u8,
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub escrow_wallet: Pubkey,
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
    const LEN: usize = 1 + (4*32) + (3 * 8) + 1 + 1 + 8 + 1 + (3 * 8);
}