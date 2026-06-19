use soroban_sdk::{token, Address, Env};

use crate::errors::Error;
use crate::events;
use crate::storage::Storage;
use crate::types::ShipmentStatus;

fn usdc(env: &Env) -> Result<token::Client, Error> {
    let addr = Storage::get_usdc_token(env).ok_or(Error::NotInitialized)?;
    Ok(token::Client::new(env, &addr))
}

pub fn fund_escrow(env: &Env, shipment_id: u64, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    if shipment.status != ShipmentStatus::Registered {
        return Err(Error::EscrowAlreadyFunded);
    }
    // Reject both under- and over-payment; escrow must match the agreed value exactly.
    if amount != shipment.freight_value {
        return Err(Error::InsufficientEscrow);
    }

    shipment.shipper.require_auth();

    usdc(env)?.transfer(&shipment.shipper, &env.current_contract_address(), &amount);

    Storage::set_escrow_balance(env, shipment_id, amount);
    shipment.status = ShipmentStatus::Funded;
    Storage::set_shipment(env, &shipment);

    events::escrow_funded(env, shipment_id, amount);
    Ok(())
}

pub fn release_escrow_to_carrier(env: &Env, shipment_id: u64) -> Result<(), Error> {
    let shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    let balance = Storage::get_escrow_balance(env, shipment_id);
    let fee_bps = Storage::get_platform_fee_bps(env) as i128;

    let platform_fee = balance
        .checked_mul(fee_bps)
        .and_then(|v| v.checked_div(10_000))
        .ok_or(Error::Overflow)?;

    let carrier_amount = balance.checked_sub(platform_fee).ok_or(Error::Overflow)?;

    let client = usdc(env)?;
    if carrier_amount > 0 {
        client.transfer(&env.current_contract_address(), &shipment.carrier, &carrier_amount);
    }

    Storage::add_accumulated_fees(env, platform_fee);
    Storage::set_escrow_balance(env, shipment_id, 0);

    events::delivery_confirmed(env, shipment_id, &shipment.carrier, carrier_amount);
    Ok(())
}

/// Splits escrow. `carrier_bps + shipper_bps` must equal 10_000 (enforced by caller).
pub fn split_escrow(
    env: &Env,
    shipment_id: u64,
    carrier_bps: u32,
    shipper_bps: u32,
) -> Result<(), Error> {
    if carrier_bps.checked_add(shipper_bps).ok_or(Error::Overflow)? != 10_000 {
        return Err(Error::InvalidFeeBps);
    }

    let shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    let balance = Storage::get_escrow_balance(env, shipment_id);
    let client = usdc(env)?;

    let carrier_amount = balance
        .checked_mul(carrier_bps as i128)
        .and_then(|v| v.checked_div(10_000))
        .ok_or(Error::Overflow)?;

    // Use remainder to eliminate rounding dust
    let shipper_amount = balance.checked_sub(carrier_amount).ok_or(Error::Overflow)?;

    if carrier_amount > 0 {
        client.transfer(&env.current_contract_address(), &shipment.carrier, &carrier_amount);
    }
    if shipper_amount > 0 {
        client.transfer(&env.current_contract_address(), &shipment.shipper, &shipper_amount);
    }

    Storage::set_escrow_balance(env, shipment_id, 0);
    Ok(())
}

pub fn withdraw_platform_fees(env: &Env, to: &Address) -> Result<(), Error> {
    let fees = Storage::get_accumulated_fees(env);
    if fees == 0 {
        return Err(Error::NoFeesToWithdraw);
    }

    usdc(env)?.transfer(&env.current_contract_address(), to, &fees);
    Storage::clear_accumulated_fees(env);

    events::fees_withdrawn(env, to, fees);
    Ok(())
}
