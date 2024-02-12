use anchor_lang::prelude::*;
use crate::ErrorCode;

#[error_code]
pub enum SpeedMarketsError {
    #[msg("Strike time lower than current time")]
    StrikeTimeLowerThanCurrentTime,
}
