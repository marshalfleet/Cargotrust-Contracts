use soroban_sdk::{Address, Env, String};

use crate::errors::Error;
use crate::escrow;
use crate::events;
use crate::storage::Storage;
use crate::types::{Dispute, DisputeOutcome, ShipmentStatus};

/// `caller` must be either the shipment's shipper or carrier.
/// Auth is required first, then role is validated.
pub fn raise_dispute(
    env: &Env,
    caller: Address,
    shipment_id: u64,
    reason: String,
) -> Result<u64, Error> {
    // Require auth before any storage reads or role checks.
    caller.require_auth();

    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    match shipment.status {
        ShipmentStatus::InTransit | ShipmentStatus::Delivered => {}
        _ => return Err(Error::InvalidStatusTransition),
    }

    if Storage::get_dispute_id_for_shipment(env, shipment_id).is_some() {
        return Err(Error::DisputeAlreadyOpen);
    }

    if caller != shipment.shipper && caller != shipment.carrier {
        return Err(Error::NotAuthorized);
    }

    let dispute_id = Storage::next_dispute_id(env);

    let dispute = Dispute {
        id: dispute_id,
        shipment_id,
        raised_by: caller.clone(),
        reason,
        outcome: DisputeOutcome::Pending,
        carrier_bps: 0,
        shipper_bps: 0,
        opened_ledger: env.ledger().sequence(),
        resolved_ledger: 0,
    };

    Storage::set_dispute(env, &dispute);
    Storage::set_dispute_id_for_shipment(env, shipment_id, dispute_id);

    let mut stats = Storage::get_carrier_stats(env, &shipment.carrier);
    stats.disputed += 1;
    Storage::set_carrier_stats(env, &shipment.carrier, &stats);

    shipment.status = ShipmentStatus::Disputed;
    shipment.dispute_id = Some(dispute_id);
    Storage::set_shipment(env, &shipment);

    events::dispute_opened(env, dispute_id, shipment_id, &caller);
    Ok(dispute_id)
}

pub fn resolve_dispute(
    env: &Env,
    dispute_id: u64,
    carrier_bps: u32,
    shipper_bps: u32,
) -> Result<(), Error> {
    if carrier_bps.checked_add(shipper_bps).ok_or(Error::Overflow)? != 10_000 {
        return Err(Error::InvalidFeeBps);
    }

    let arbitrator = Storage::get_arbitrator(env).ok_or(Error::NotAuthorized)?;
    arbitrator.require_auth();

    let mut dispute = Storage::get_dispute(env, dispute_id)
        .ok_or(Error::DisputeNotFound)?;

    if dispute.outcome != DisputeOutcome::Pending {
        return Err(Error::InvalidStatusTransition);
    }

    escrow::split_escrow(env, dispute.shipment_id, carrier_bps, shipper_bps)?;

    dispute.outcome = match (carrier_bps, shipper_bps) {
        (10_000, 0) => DisputeOutcome::CarrierWins,
        (0, 10_000) => DisputeOutcome::ShipperWins,
        _ => DisputeOutcome::Split,
    };
    dispute.carrier_bps = carrier_bps;
    dispute.shipper_bps = shipper_bps;
    dispute.resolved_ledger = env.ledger().sequence();
    Storage::set_dispute(env, &dispute);

    let mut shipment = Storage::get_shipment(env, dispute.shipment_id)
        .ok_or(Error::ShipmentNotFound)?;
    shipment.status = ShipmentStatus::Resolved;
    Storage::set_shipment(env, &shipment);

    events::dispute_resolved(env, dispute_id, carrier_bps, shipper_bps);
    Ok(())
}
