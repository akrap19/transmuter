//! Decode a Pyth pull `PriceUpdateV2` account or the mock_pyth `PriceFeed`
//! layout. Stale and wide-confidence prints are errors (S13): callers must
//! not advance reserve-mint / trouble continuity clocks on them.
//!
//! The mock layout exists so the lifecycle script can still `set_price` to
//! force Path A (spec: "force the trigger with a price set"). Real Solana
//! public-devnet feeds are the same `PriceUpdateV2` bytes.

use transmuter_constants::{
    MOCK_PYTH_PROGRAM, ORACLE_MAX_CONF_BPS, ORACLE_MAX_STALENESS_SECS, PYTH_RECEIVER_PROGRAM,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OraclePrice {
    pub price: i64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OracleError {
    BadLayout,
    InvalidPrice,
    Stale,
    WideConfidence,
    BadOwner,
}

/// `rec5EKMGg6MxZWaMbitBFZouL8cRSrkNRK57yRpBEVV` (Pyth pull receiver) or
/// the workspace mock_pyth program.
pub fn owner_is_allowed(owner: &[u8; 32]) -> bool {
    owner == &PYTH_RECEIVER_PROGRAM || owner == &MOCK_PYTH_PROGRAM
}

pub fn read_oracle_price(data: &[u8]) -> Result<OraclePrice, OracleError> {
    if data.len() >= 133 {
        decode_price_update_v2(data).ok_or(OracleError::BadLayout)
    } else if data.len() >= 36 {
        decode_mock_price_feed(data).ok_or(OracleError::BadLayout)
    } else {
        Err(OracleError::BadLayout)
    }
}

pub fn validate(
    price: &OraclePrice,
    now: i64,
    max_stale_secs: i64,
    max_conf_bps: u64,
) -> Result<(), OracleError> {
    if price.price <= 0 {
        return Err(OracleError::InvalidPrice);
    }
    if now.saturating_sub(price.publish_time) > max_stale_secs {
        return Err(OracleError::Stale);
    }
    let conf_bps = (price.conf as u128)
        .saturating_mul(10_000)
        / (price.price as u128);
    if conf_bps > max_conf_bps as u128 {
        return Err(OracleError::WideConfidence);
    }
    Ok(())
}

pub fn validate_default(price: &OraclePrice, now: i64) -> Result<(), OracleError> {
    validate(
        price,
        now,
        ORACLE_MAX_STALENESS_SECS,
        ORACLE_MAX_CONF_BPS,
    )
}

/// SOL/USD in USDC atomic (6 dp). Truncates toward zero (protocol rounding).
pub fn oracle_to_usdc_6(price: i64, expo: i32) -> Option<u64> {
    if price <= 0 {
        return None;
    }
    let exp = expo.checked_add(6)?;
    if exp >= 0 {
        let factor = 10i64.checked_pow(exp as u32)?;
        price.checked_mul(factor).map(|v| v as u64)
    } else {
        let div = 10i64.checked_pow((-exp) as u32)?;
        Some((price / div) as u64)
    }
}

fn decode_mock_price_feed(data: &[u8]) -> Option<OraclePrice> {
    // 8-byte Anchor discriminator, then PriceFeed { price, conf, expo, publish_time }.
    Some(OraclePrice {
        price: i64::from_le_bytes(data[8..16].try_into().ok()?),
        conf: u64::from_le_bytes(data[16..24].try_into().ok()?),
        expo: i32::from_le_bytes(data[24..28].try_into().ok()?),
        publish_time: i64::from_le_bytes(data[28..36].try_into().ok()?),
    })
}

fn decode_price_update_v2(data: &[u8]) -> Option<OraclePrice> {
    // Skip 8-byte Anchor discriminator. VerificationLevel::Full is 1 byte (0x01);
    // Partial is 2 bytes (0x00, n). PriceFeedMessage is 84 bytes.
    let v = data.get(8..)?;
    if v.len() < 32 + 1 {
        return None;
    }
    let full = v[32] == 0x01;
    let msg_off = if full { 33 } else { 34 };
    let m = v.get(msg_off..msg_off + 84)?;
    Some(OraclePrice {
        price: i64::from_le_bytes(m[32..40].try_into().ok()?),
        conf: u64::from_le_bytes(m[40..48].try_into().ok()?),
        expo: i32::from_le_bytes(m[48..52].try_into().ok()?),
        publish_time: i64::from_le_bytes(m[52..60].try_into().ok()?),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use transmuter_constants::PYTH_SOL_USD_FEED_ID;

    fn mock_bytes(price: i64, conf: u64, expo: i32, ts: i64) -> Vec<u8> {
        let mut d = vec![0u8; 8];
        d.extend_from_slice(&price.to_le_bytes());
        d.extend_from_slice(&conf.to_le_bytes());
        d.extend_from_slice(&expo.to_le_bytes());
        d.extend_from_slice(&ts.to_le_bytes());
        d
    }

    fn v2_bytes(price: i64, conf: u64, expo: i32, ts: i64) -> Vec<u8> {
        let mut d = vec![0u8; 8];
        d.extend_from_slice(&[0u8; 32]);
        d.push(0x01);
        d.extend_from_slice(&PYTH_SOL_USD_FEED_ID);
        d.extend_from_slice(&price.to_le_bytes());
        d.extend_from_slice(&conf.to_le_bytes());
        d.extend_from_slice(&expo.to_le_bytes());
        d.extend_from_slice(&ts.to_le_bytes());
        d.extend_from_slice(&ts.to_le_bytes());
        d.extend_from_slice(&price.to_le_bytes());
        d.extend_from_slice(&conf.to_le_bytes());
        d.extend_from_slice(&1u64.to_le_bytes());
        d
    }

    #[test]
    fn mock_price_feed_reads_independent_literals() {
        let got = read_oracle_price(&mock_bytes(148_000_000, 25_000, -8, 1_700_000_000)).unwrap();
        assert_eq!(got.price, 148_000_000);
        assert_eq!(got.conf, 25_000);
        assert_eq!(got.expo, -8);
        assert_eq!(got.publish_time, 1_700_000_000);
    }

    #[test]
    fn price_update_v2_reads_sol_usd_literals() {
        let got = read_oracle_price(&v2_bytes(15_000_000_000, 50_000_000, -8, 1_800_000_000)).unwrap();
        assert_eq!(got.price, 15_000_000_000);
        assert_eq!(got.conf, 50_000_000);
        assert_eq!(got.expo, -8);
        assert_eq!(got.publish_time, 1_800_000_000);
        assert_eq!(oracle_to_usdc_6(got.price, got.expo), Some(150_000_000));
    }

    #[test]
    fn stale_print_is_disagreement() {
        let p = OraclePrice {
            price: 15_000_000_000,
            conf: 1,
            expo: -8,
            publish_time: 800,
        };
        assert_eq!(validate_default(&p, 1_000), Err(OracleError::Stale));
        let fresh = OraclePrice {
            publish_time: 950,
            ..p
        };
        assert_eq!(validate_default(&fresh, 1_000), Ok(()));
    }

    #[test]
    fn wide_confidence_is_disagreement() {
        // 501 bps of 10_000 > 500 bps cap.
        let p = OraclePrice {
            price: 10_000,
            conf: 501,
            expo: 0,
            publish_time: 1_000,
        };
        assert_eq!(validate_default(&p, 1_000), Err(OracleError::WideConfidence));
        let ok = OraclePrice { conf: 500, ..p };
        assert_eq!(validate_default(&ok, 1_000), Ok(()));
    }

    #[test]
    fn owner_allows_pyth_receiver_and_mock_only() {
        assert!(owner_is_allowed(&PYTH_RECEIVER_PROGRAM));
        assert!(owner_is_allowed(&MOCK_PYTH_PROGRAM));
        assert!(!owner_is_allowed(&[0u8; 32]));
    }

    #[test]
    fn empty_buffer_is_bad_layout() {
        assert_eq!(read_oracle_price(&[]), Err(OracleError::BadLayout));
    }
}
