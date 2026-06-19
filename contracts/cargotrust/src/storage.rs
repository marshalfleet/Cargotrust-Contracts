use soroban_sdk::{contracttype, Address, Env};

use crate::types::{CarrierStats, Dispute, Milestone, Shipment};

// TTL constants (in ledgers). ~1 year on mainnet (~5s per ledger).
const PERSISTENT_TTL_THRESHOLD: u32 = 100_000;
const PERSISTENT_TTL_TARGET: u32 = 6_307_200; // ~1 year
const INSTANCE_TTL_THRESHOLD: u32 = 100_000;
const INSTANCE_TTL_TARGET: u32 = 6_307_200;

#[contracttype]
enum DataKey {
    Initialized,
    Paused,
    Admin,
    UsdcToken,
    PlatformFeeBps,
    Arbitrator,
    ShipmentCount,
    DisputeCount,
    Shipment(u64),
    MilestoneCount(u64),
    Milestone(u64, u32), // (shipment_id, index)
    EscrowBalance(u64),
    DisputeByShipment(u64),
    Dispute(u64),
    CarrierStats(Address),
    AccumulatedFees,
}

fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_TARGET);
}

fn extend_persistent<K: soroban_sdk::TryIntoVal<Env, soroban_sdk::Val>>(env: &Env, key: &K) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_TARGET);
}

pub struct Storage;

impl Storage {
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&DataKey::Initialized)
    }

    pub fn set_initialized(env: &Env) {
        env.storage().instance().set(&DataKey::Initialized, &true);
        extend_instance(env);
    }

    pub fn is_paused(env: &Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn set_paused(env: &Env, paused: bool) {
        env.storage().instance().set(&DataKey::Paused, &paused);
        extend_instance(env);
    }

    pub fn get_admin(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    pub fn set_admin(env: &Env, admin: &Address) {
        env.storage().instance().set(&DataKey::Admin, admin);
        extend_instance(env);
    }

    pub fn get_usdc_token(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::UsdcToken)
    }

    pub fn set_usdc_token(env: &Env, token: &Address) {
        env.storage().instance().set(&DataKey::UsdcToken, token);
        extend_instance(env);
    }

    pub fn get_platform_fee_bps(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .unwrap_or(100)
    }

    pub fn set_platform_fee_bps(env: &Env, bps: u32) {
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &bps);
        extend_instance(env);
    }

    pub fn get_arbitrator(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Arbitrator)
    }

    pub fn set_arbitrator(env: &Env, arbitrator: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::Arbitrator, arbitrator);
        extend_instance(env);
    }

    pub fn next_shipment_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ShipmentCount)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::ShipmentCount, &id);
        extend_instance(env);
        id
    }

    pub fn next_dispute_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DisputeCount)
            .unwrap_or(0u64)
            + 1;
        env.storage().instance().set(&DataKey::DisputeCount, &id);
        extend_instance(env);
        id
    }

    pub fn get_shipment(env: &Env, id: u64) -> Option<Shipment> {
        let key = DataKey::Shipment(id);
        let val = env.storage().persistent().get(&key);
        if val.is_some() {
            extend_persistent(env, &key);
        }
        val
    }

    pub fn set_shipment(env: &Env, shipment: &Shipment) {
        let key = DataKey::Shipment(shipment.id);
        env.storage().persistent().set(&key, shipment);
        extend_persistent(env, &key);
    }

    pub fn get_milestone_count(env: &Env, shipment_id: u64) -> u32 {
        let key = DataKey::MilestoneCount(shipment_id);
        env.storage().persistent().get(&key).unwrap_or(0u32)
    }

    pub fn push_milestone(env: &Env, shipment_id: u64, milestone: &Milestone) {
        let count = Self::get_milestone_count(env, shipment_id);
        let m_key = DataKey::Milestone(shipment_id, count);
        env.storage().persistent().set(&m_key, milestone);
        extend_persistent(env, &m_key);

        let count_key = DataKey::MilestoneCount(shipment_id);
        env.storage()
            .persistent()
            .set(&count_key, &(count + 1));
        extend_persistent(env, &count_key);
    }

    pub fn get_milestone(env: &Env, shipment_id: u64, index: u32) -> Option<Milestone> {
        let key = DataKey::Milestone(shipment_id, index);
        let val = env.storage().persistent().get(&key);
        if val.is_some() {
            extend_persistent(env, &key);
        }
        val
    }

    pub fn get_all_milestones(env: &Env, shipment_id: u64) -> soroban_sdk::Vec<Milestone> {
        let count = Self::get_milestone_count(env, shipment_id);
        let mut result = soroban_sdk::Vec::new(env);
        for i in 0..count {
            if let Some(m) = Self::get_milestone(env, shipment_id, i) {
                result.push_back(m);
            }
        }
        result
    }

    pub fn get_escrow_balance(env: &Env, shipment_id: u64) -> i128 {
        let key = DataKey::EscrowBalance(shipment_id);
        env.storage().persistent().get(&key).unwrap_or(0i128)
    }

    pub fn set_escrow_balance(env: &Env, shipment_id: u64, balance: i128) {
        let key = DataKey::EscrowBalance(shipment_id);
        env.storage().persistent().set(&key, &balance);
        extend_persistent(env, &key);
    }

    pub fn get_dispute_id_for_shipment(env: &Env, shipment_id: u64) -> Option<u64> {
        let key = DataKey::DisputeByShipment(shipment_id);
        env.storage().persistent().get(&key)
    }

    pub fn set_dispute_id_for_shipment(env: &Env, shipment_id: u64, dispute_id: u64) {
        let key = DataKey::DisputeByShipment(shipment_id);
        env.storage().persistent().set(&key, &dispute_id);
        extend_persistent(env, &key);
    }

    pub fn get_dispute(env: &Env, id: u64) -> Option<Dispute> {
        let key = DataKey::Dispute(id);
        let val = env.storage().persistent().get(&key);
        if val.is_some() {
            extend_persistent(env, &key);
        }
        val
    }

    pub fn set_dispute(env: &Env, dispute: &Dispute) {
        let key = DataKey::Dispute(dispute.id);
        env.storage().persistent().set(&key, dispute);
        extend_persistent(env, &key);
    }

    pub fn get_carrier_stats(env: &Env, carrier: &Address) -> CarrierStats {
        let key = DataKey::CarrierStats(carrier.clone());
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_default()
    }

    pub fn set_carrier_stats(env: &Env, carrier: &Address, stats: &CarrierStats) {
        let key = DataKey::CarrierStats(carrier.clone());
        env.storage().persistent().set(&key, stats);
        extend_persistent(env, &key);
    }

    pub fn get_accumulated_fees(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::AccumulatedFees)
            .unwrap_or(0i128)
    }

    pub fn add_accumulated_fees(env: &Env, amount: i128) {
        let current = Self::get_accumulated_fees(env);
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &(current + amount));
        extend_instance(env);
    }

    pub fn clear_accumulated_fees(env: &Env) {
        env.storage()
            .instance()
            .set(&DataKey::AccumulatedFees, &0i128);
        extend_instance(env);
    }
}
