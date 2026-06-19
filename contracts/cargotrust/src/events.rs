use soroban_sdk::{symbol_short, Address, Env};

use crate::types::MilestoneStatus;

pub fn cargo_registered(env: &Env, shipment_id: u64, shipper: &Address, carrier: &Address) {
    env.events().publish(
        (symbol_short!("cargo_reg"), shipment_id),
        (shipper.clone(), carrier.clone()),
    );
}

pub fn escrow_funded(env: &Env, shipment_id: u64, amount: i128) {
    env.events()
        .publish((symbol_short!("escrw_fnd"), shipment_id), amount);
}

pub fn shipment_accepted(env: &Env, shipment_id: u64, carrier: &Address) {
    env.events().publish(
        (symbol_short!("shp_accpt"), shipment_id),
        carrier.clone(),
    );
}

pub fn milestone_posted(env: &Env, shipment_id: u64, status: &MilestoneStatus) {
    env.events().publish(
        (symbol_short!("milestone"), shipment_id),
        status.clone(),
    );
}

pub fn delivery_proof(env: &Env, shipment_id: u64) {
    env.events()
        .publish((symbol_short!("dlv_proof"), shipment_id), ());
}

pub fn delivery_confirmed(env: &Env, shipment_id: u64, carrier: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("dlv_conf"), shipment_id),
        (carrier.clone(), amount),
    );
}

pub fn dispute_opened(env: &Env, dispute_id: u64, shipment_id: u64, raised_by: &Address) {
    env.events().publish(
        (symbol_short!("disp_opn"), dispute_id),
        (shipment_id, raised_by.clone()),
    );
}

pub fn dispute_resolved(env: &Env, dispute_id: u64, carrier_bps: u32, shipper_bps: u32) {
    env.events().publish(
        (symbol_short!("disp_res"), dispute_id),
        (carrier_bps, shipper_bps),
    );
}

pub fn fees_withdrawn(env: &Env, to: &Address, amount: i128) {
    env.events()
        .publish((symbol_short!("fees_wdw"),), (to.clone(), amount));
}
