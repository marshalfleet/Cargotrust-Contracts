use soroban_sdk::{Address, BytesN, Env, String};

use crate::errors::Error;
use crate::events;
use crate::storage::Storage;
use crate::types::{Shipment, ShipmentStatus};

pub const GOODS_DESCRIPTION_MAX_LEN: u32 = 256;

pub fn register_cargo(
    env: &Env,
    shipper: Address,
    carrier: Address,
    consignee: Address,
    goods_description: String,
    freight_value: i128,
    doc_hash: BytesN<32>,
) -> Result<u64, Error> {
    if freight_value <= 0 {
        return Err(Error::InvalidAmount);
    }
    if goods_description.len() > GOODS_DESCRIPTION_MAX_LEN {
        return Err(Error::InvalidInput);
    }

    let id = Storage::next_shipment_id(env);

    let shipment = Shipment {
        id,
        shipper: shipper.clone(),
        carrier: carrier.clone(),
        consignee,
        goods_description,
        freight_value,
        doc_hash,
        status: ShipmentStatus::Registered,
        created_ledger: env.ledger().sequence(),
        delivered_ledger: None,
        dispute_id: None,
    };

    Storage::set_shipment(env, &shipment);
    events::cargo_registered(env, id, &shipper, &carrier);

    Ok(id)
}
