use anchor_lang::prelude::*;

declare_id!("EfscCNT9ERcPjNatjatcJRsuWLjqo5jSngbbS4Yim1i");

pub fn wrap_to_u64(x: i64) -> u64 {
    (x as u64).wrapping_add(u64::MAX/2 + 1)
}

#[program]
mod speed_markets {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: String) -> Result<()> {
        let second_base_account = &mut ctx.accounts.second_base_account;
        let copy = data.clone();
        second_base_account.data = data;
        second_base_account.data_list.push(copy);
        Ok(())
    }

    // pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, asset: str, strikeTime: u64, direction: u8, buyInAmount: u64, skewImpact: u64) -> Result<()> {
    pub fn create_speed_market(ctx: Context<CreateSpeedMarket>, bump: u8, strike_time: u64, direction: u8) -> Result<()> {
        let bump = &[bump][..];
        let mut current_timestamp = Clock::get()?.unix_timestamp;
        require!(strike_time > wrap_to_u64(current_timestamp, Errors::StrikeTimeInThePast);
        
        Ok(())
    }
    pub fn create(ctx: Context<Create>) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        base_account.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        base_account.count += 2;
        Ok(())
    }

    pub fn decrement(ctx: Context<Increment>) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        base_account.count -= 1;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, data: String) -> Result<()> {
        let second_base_account = &mut ctx.accounts.second_base_account;
        let copy = data.clone();
        second_base_account.data = data;
        second_base_account.data_list.push(copy);
        Ok(())
    }
}

#[error_code]
pub enum Errors {
    #[msg("Strike time lower than current time")]
    StrikeTimeInThePast
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 64 + 64)]
    pub second_base_account: Account<'info, SecondBaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSpeedMarket<'info> {
    #[account(mut)]
    /// CHECK: only used as a signing PDA
    pub authority: UncheckedAccount<'info>,
}

// Transaction instructions
#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = user, space = 16 + 16)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}

// Transaction instructions
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub second_base_account: Account<'info, SecondBaseAccount>,
}

#[account]
pub struct SecondBaseAccount {
    pub data: String,
    pub data_list: Vec<String>,
}

// An account that goes inside a transaction instruction
#[account]
pub struct BaseAccount {
    pub count: u64,
}