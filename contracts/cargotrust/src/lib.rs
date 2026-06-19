#![no_std]

mod cargo_register;
mod dispute;
mod errors;
mod escrow;
mod events;
mod shipment;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use types::*;

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String};

use errors::Error;
use storage::Storage;

#[contract]
pub struct CargoTrustContract;

#[contractimpl]
impl CargoTrustContract {
    // ── Admin ──────────────────────────────────────────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        usdc_token: Address,
        platform_fee_bps: u32,
        arbitrator: Address,
    ) -> Result<(), Error> {
        if Storage::is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }
        if platform_fee_bps > 10_000 {
            return Err(Error::InvalidFeeBps);
        }
        admin.require_auth();
        Storage::set_admin(&env, &admin);
        Storage::set_usdc_token(&env, &usdc_token);
        Storage::set_platform_fee_bps(&env, platform_fee_bps);
        Storage::set_arbitrator(&env, &arbitrator);
        Storage::set_initialized(&env);
        Ok(())
    }

    pub fn update_platform_fee(env: Env, fee_bps: u32) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if fee_bps > 10_000 {
            return Err(Error::InvalidFeeBps);
        }
        Storage::set_platform_fee_bps(&env, fee_bps);
        Ok(())
    }

    pub fn update_arbitrator(env: Env, new_arbitrator: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        Storage::set_arbitrator(&env, &new_arbitrator);
        Ok(())
    }

    pub fn withdraw_fees(env: Env, to: Address) -> Result<(), Error> {
        Self::require_admin(&env)?;
        escrow::withdraw_platform_fees(&env, &to)
    }

    pub fn pause_contract(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        Storage::set_paused(&env, true);
        Ok(())
    }

    pub fn unpause_contract(env: Env) -> Result<(), Error> {
        Self::require_admin(&env)?;
        Storage::set_paused(&env, false);
        Ok(())
    }

    // ── Shipper ────────────────────────────────────────────────────────────

    pub fn register_cargo(
        env: Env,
        shipper: Address,
        carrier: Address,
        consignee: Address,
        goods_description: String,
        freight_value: i128,
        doc_hash: BytesN<32>,
    ) -> Result<u64, Error> {
        Self::require_active(&env)?;
        shipper.require_auth();
        cargo_register::register_cargo(
            &env,
            shipper,
            carrier,
            consignee,
            goods_description,
            freight_value,
            doc_hash,
        )
    }

    pub fn fund_escrow(env: Env, shipment_id: u64, amount: i128) -> Result<(), Error> {
        Self::require_active(&env)?;
        escrow::fund_escrow(&env, shipment_id, amount)
    }

    pub fn confirm_delivery(env: Env, shipment_id: u64) -> Result<(), Error> {
        Self::require_active(&env)?;
        shipment::confirm_delivery(&env, shipment_id)
    }

    /// Either the shipper or carrier may raise a dispute.
    pub fn raise_dispute(
        env: Env,
        caller: Address,
        shipment_id: u64,
        reason: String,
    ) -> Result<u64, Error> {
        Self::require_active(&env)?;
        dispute::raise_dispute(&env, caller, shipment_id, reason)
    }

    // ── Carrier ────────────────────────────────────────────────────────────

    pub fn accept_shipment(env: Env, shipment_id: u64) -> Result<(), Error> {
        Self::require_active(&env)?;
        shipment::accept_shipment(&env, shipment_id)
    }

    pub fn post_milestone(
        env: Env,
        shipment_id: u64,
        status: MilestoneStatus,
        location: String,
        doc_hash: Option<BytesN<32>>,
    ) -> Result<(), Error> {
        Self::require_active(&env)?;
        shipment::post_milestone(&env, shipment_id, status, location, doc_hash)
    }

    pub fn submit_delivery_proof(
        env: Env,
        shipment_id: u64,
        proof_hash: BytesN<32>,
        location: String,
    ) -> Result<(), Error> {
        Self::require_active(&env)?;
        shipment::submit_delivery_proof(&env, shipment_id, proof_hash, location)
    }

    // ── Arbitrator ─────────────────────────────────────────────────────────

    pub fn resolve_dispute(
        env: Env,
        dispute_id: u64,
        carrier_bps: u32,
        shipper_bps: u32,
    ) -> Result<(), Error> {
        Self::require_active(&env)?;
        dispute::resolve_dispute(&env, dispute_id, carrier_bps, shipper_bps)
    }

    // ── Queries ────────────────────────────────────────────────────────────

    pub fn get_shipment(env: Env, shipment_id: u64) -> Result<Shipment, Error> {
        Storage::get_shipment(&env, shipment_id).ok_or(Error::ShipmentNotFound)
    }

    pub fn get_milestones(env: Env, shipment_id: u64) -> soroban_sdk::Vec<Milestone> {
        Storage::get_all_milestones(&env, shipment_id)
    }

    pub fn get_escrow_balance(env: Env, shipment_id: u64) -> i128 {
        Storage::get_escrow_balance(&env, shipment_id)
    }

    pub fn get_dispute(env: Env, dispute_id: u64) -> Result<Dispute, Error> {
        Storage::get_dispute(&env, dispute_id).ok_or(Error::DisputeNotFound)
    }

    pub fn get_carrier_stats(env: Env, carrier: Address) -> CarrierStats {
        Storage::get_carrier_stats(&env, &carrier)
    }

    pub fn get_accumulated_fees(env: Env) -> i128 {
        Storage::get_accumulated_fees(&env)
    }

    pub fn health(env: Env) -> bool {
        Storage::is_initialized(&env) && !Storage::is_paused(&env)
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    fn require_admin(env: &Env) -> Result<(), Error> {
        Self::require_initialized(env)?;
        let admin = Storage::get_admin(env).ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !Storage::is_initialized(env) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn require_active(env: &Env) -> Result<(), Error> {
        Self::require_initialized(env)?;
        if Storage::is_paused(env) {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }
}
