use soroban_sdk::{BytesN, Env, String};

use crate::errors::Error;
use crate::escrow;
use crate::events;
use crate::storage::Storage;
use crate::types::{Milestone, MilestoneStatus, ShipmentStatus};

pub fn accept_shipment(env: &Env, shipment_id: u64) -> Result<(), Error> {
    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    if shipment.status != ShipmentStatus::Funded {
        return Err(Error::InvalidStatusTransition);
    }

    shipment.carrier.require_auth();
    shipment.status = ShipmentStatus::Accepted;
    Storage::set_shipment(env, &shipment);

    events::shipment_accepted(env, shipment_id, &shipment.carrier);
    Ok(())
}

pub fn post_milestone(
    env: &Env,
    shipment_id: u64,
    status: MilestoneStatus,
    location: String,
    doc_hash: Option<BytesN<32>>,
) -> Result<(), Error> {
    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    match shipment.status {
        ShipmentStatus::Accepted | ShipmentStatus::InTransit | ShipmentStatus::Disputed => {}
        _ => return Err(Error::InvalidStatusTransition),
    }

    shipment.carrier.require_auth();

    if status == MilestoneStatus::PickedUp && shipment.status == ShipmentStatus::Accepted {
        shipment.status = ShipmentStatus::InTransit;
        Storage::set_shipment(env, &shipment);
    }

    let index = Storage::get_milestone_count(env, shipment_id);
    let milestone = Milestone {
        shipment_id,
        index,
        status: status.clone(),
        location,
        doc_hash,
        ledger: env.ledger().sequence(),
    };

    Storage::push_milestone(env, shipment_id, &milestone);
    events::milestone_posted(env, shipment_id, &status);
    Ok(())
}

pub fn submit_delivery_proof(
    env: &Env,
    shipment_id: u64,
    proof_hash: BytesN<32>,
    location: String,
) -> Result<(), Error> {
    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    if shipment.status != ShipmentStatus::InTransit {
        return Err(Error::InvalidStatusTransition);
    }

    shipment.carrier.require_auth();

    let index = Storage::get_milestone_count(env, shipment_id);
    let milestone = Milestone {
        shipment_id,
        index,
        status: MilestoneStatus::Delivered,
        location,
        doc_hash: Some(proof_hash),
        ledger: env.ledger().sequence(),
    };

    Storage::push_milestone(env, shipment_id, &milestone);
    shipment.status = ShipmentStatus::Delivered;
    shipment.delivered_ledger = Some(env.ledger().sequence());
    Storage::set_shipment(env, &shipment);

    events::delivery_proof(env, shipment_id);
    Ok(())
}

pub fn confirm_delivery(env: &Env, shipment_id: u64) -> Result<(), Error> {
    let mut shipment = Storage::get_shipment(env, shipment_id)
        .ok_or(Error::ShipmentNotFound)?;

    if shipment.status != ShipmentStatus::Delivered {
        return Err(Error::InvalidStatusTransition);
    }

    shipment.shipper.require_auth();

    escrow::release_escrow_to_carrier(env, shipment_id)?;

    let mut stats = Storage::get_carrier_stats(env, &shipment.carrier);
    stats.completed += 1;
    Storage::set_carrier_stats(env, &shipment.carrier, &stats);

    shipment.status = ShipmentStatus::Closed;
    Storage::set_shipment(env, &shipment);
    Ok(())
}
