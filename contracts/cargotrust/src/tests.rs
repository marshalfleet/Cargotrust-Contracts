#![cfg(test)]

use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env, String};

use crate::{CargoTrustContract, CargoTrustContractClient, MilestoneStatus};

fn create_token<'a>(env: &Env, admin: &Address) -> token::StellarAssetClient<'a> {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    token::StellarAssetClient::new(env, &token_id.address())
}

struct TestEnv<'a> {
    env: Env,
    client: CargoTrustContractClient<'a>,
    usdc_id: Address,
    admin: Address,
    arbitrator: Address,
    shipper: Address,
    carrier: Address,
    consignee: Address,
}

impl<'a> TestEnv<'a> {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let arbitrator = Address::generate(&env);
        let shipper = Address::generate(&env);
        let carrier = Address::generate(&env);
        let consignee = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token = create_token(&env, &token_admin);
        let usdc_id = token.address.clone();
        token.mint(&shipper, &1_000_000_000);

        let contract_id = env.register(CargoTrustContract, ());
        let client = CargoTrustContractClient::new(&env, &contract_id);
        client.initialize(&admin, &usdc_id, &100u32, &arbitrator);

        TestEnv { env, client, usdc_id, admin, arbitrator, shipper, carrier, consignee }
    }

    fn doc_hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[1u8; 32])
    }

    fn proof_hash(&self) -> BytesN<32> {
        BytesN::from_array(&self.env, &[2u8; 32])
    }

    fn register_and_fund(&self) -> u64 {
        let id = self.client.register_cargo(
            &self.shipper, &self.carrier, &self.consignee,
            &String::from_str(&self.env, "Electronics"),
            &500_000_000i128, &self.doc_hash(),
        );
        self.client.fund_escrow(&id, &500_000_000i128);
        id
    }

    fn reach_in_transit(&self) -> u64 {
        let id = self.register_and_fund();
        self.client.accept_shipment(&id);
        self.client.post_milestone(
            &id, &MilestoneStatus::PickedUp,
            &String::from_str(&self.env, "Shanghai Port"), &None,
        );
        id
    }

    fn reach_delivered(&self) -> u64 {
        let id = self.reach_in_transit();
        self.client.submit_delivery_proof(
            &id, &self.proof_hash(),
            &String::from_str(&self.env, "Los Angeles Port"),
        );
        id
    }
}

// ── Initialization ─────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    assert!(TestEnv::setup().client.health());
}

#[test]
#[should_panic(expected = "AlreadyInitialized")]
fn test_double_initialize_fails() {
    let t = TestEnv::setup();
    t.client.initialize(&t.admin, &t.usdc_id, &100u32, &t.arbitrator);
}

// ── Cargo Registration ─────────────────────────────────────────────────────

#[test]
fn test_register_cargo() {
    let t = TestEnv::setup();
    let id = t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Auto Parts"),
        &1_000_000i128, &t.doc_hash(),
    );
    assert_eq!(id, 1);
    let shipment = t.client.get_shipment(&id);
    assert_eq!(shipment.freight_value, 1_000_000i128);
    assert!(shipment.delivered_ledger.is_none());
}

#[test]
#[should_panic(expected = "InvalidAmount")]
fn test_register_zero_value_fails() {
    let t = TestEnv::setup();
    t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Goods"), &0i128, &t.doc_hash(),
    );
}

#[test]
#[should_panic(expected = "InvalidAmount")]
fn test_register_description_too_long_fails() {
    let t = TestEnv::setup();
    // 257 characters
    let long = String::from_str(&t.env, &"x".repeat(257));
    t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &long, &1_000i128, &t.doc_hash(),
    );
}

// ── Escrow Funding ─────────────────────────────────────────────────────────

#[test]
fn test_fund_escrow_exact() {
    let t = TestEnv::setup();
    let id = t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Textiles"),
        &500_000_000i128, &t.doc_hash(),
    );
    t.client.fund_escrow(&id, &500_000_000i128);
    assert_eq!(t.client.get_escrow_balance(&id), 500_000_000i128);
}

#[test]
#[should_panic(expected = "InsufficientEscrow")]
fn test_fund_escrow_overpayment_rejected() {
    let t = TestEnv::setup();
    let id = t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Textiles"),
        &500_000_000i128, &t.doc_hash(),
    );
    t.client.fund_escrow(&id, &500_000_001i128);
}

#[test]
#[should_panic(expected = "InsufficientEscrow")]
fn test_fund_escrow_underpayment_rejected() {
    let t = TestEnv::setup();
    let id = t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Textiles"),
        &500_000_000i128, &t.doc_hash(),
    );
    t.client.fund_escrow(&id, &499_999_999i128);
}

#[test]
#[should_panic(expected = "EscrowAlreadyFunded")]
fn test_double_fund_fails() {
    let t = TestEnv::setup();
    let id = t.register_and_fund();
    t.client.fund_escrow(&id, &500_000_000i128);
}

// ── Happy path ─────────────────────────────────────────────────────────────

#[test]
fn test_full_happy_path() {
    let t = TestEnv::setup();
    let id = t.reach_delivered();
    t.client.confirm_delivery(&id);

    assert_eq!(t.client.get_escrow_balance(&id), 0);
    assert_eq!(t.client.get_carrier_stats(&t.carrier).completed, 1);

    let shipment = t.client.get_shipment(&id);
    assert!(shipment.delivered_ledger.is_some());
}

// ── submit_delivery_proof with location ───────────────────────────────────

#[test]
fn test_delivery_proof_stores_location() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    t.client.submit_delivery_proof(
        &id, &t.proof_hash(),
        &String::from_str(&t.env, "Rotterdam Port"),
    );
    let milestones = t.client.get_milestones(&id);
    let last = milestones.get(milestones.len() - 1).unwrap();
    assert_eq!(last.location, String::from_str(&t.env, "Rotterdam Port"));
}

// ── Milestones (per-index) ─────────────────────────────────────────────────

#[test]
fn test_milestone_count() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit(); // PickedUp = index 0
    t.client.post_milestone(
        &id, &MilestoneStatus::InTransit,
        &String::from_str(&t.env, "Pacific Ocean"), &None,
    );
    assert_eq!(t.client.get_milestones(&id).len(), 2);
}

// ── Dispute — shipper raises ───────────────────────────────────────────────

#[test]
fn test_shipper_raises_dispute() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    let dispute_id = t.client.raise_dispute(
        &t.shipper, &id, &String::from_str(&t.env, "Goods damaged"),
    );
    let dispute = t.client.get_dispute(&dispute_id);
    assert_eq!(dispute.raised_by, t.shipper);
    t.client.resolve_dispute(&dispute_id, &0u32, &10_000u32);
    assert_eq!(t.client.get_escrow_balance(&id), 0);
}

// ── Dispute — carrier raises ───────────────────────────────────────────────

#[test]
fn test_carrier_raises_dispute() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    let dispute_id = t.client.raise_dispute(
        &t.carrier, &id, &String::from_str(&t.env, "Shipper unreachable"),
    );
    let dispute = t.client.get_dispute(&dispute_id);
    assert_eq!(dispute.raised_by, t.carrier);
    t.client.resolve_dispute(&dispute_id, &10_000u32, &0u32);
    assert_eq!(t.client.get_escrow_balance(&id), 0);
}

// ── Dispute from Delivered status ──────────────────────────────────────────

#[test]
fn test_shipper_raises_dispute_after_delivery() {
    let t = TestEnv::setup();
    let id = t.reach_delivered();
    let dispute_id = t.client.raise_dispute(
        &t.shipper, &id, &String::from_str(&t.env, "Wrong goods delivered"),
    );
    t.client.resolve_dispute(&dispute_id, &0u32, &10_000u32);
    assert_eq!(t.client.get_escrow_balance(&id), 0);
}

#[test]
#[should_panic(expected = "NotAuthorized")]
fn test_stranger_cannot_raise_dispute() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    t.client.raise_dispute(
        &Address::generate(&t.env), &id,
        &String::from_str(&t.env, "Nope"),
    );
}

#[test]
#[should_panic(expected = "DisputeAlreadyOpen")]
fn test_double_dispute_fails() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    t.client.raise_dispute(&t.shipper, &id, &String::from_str(&t.env, "First"));
    t.client.raise_dispute(&t.shipper, &id, &String::from_str(&t.env, "Second"));
}

// ── Dispute split ──────────────────────────────────────────────────────────

#[test]
fn test_dispute_split_no_dust() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    let dispute_id = t.client.raise_dispute(
        &t.shipper, &id, &String::from_str(&t.env, "Partial loss"),
    );
    t.client.resolve_dispute(&dispute_id, &6_000u32, &4_000u32);
    assert_eq!(t.client.get_escrow_balance(&id), 0);
}

#[test]
#[should_panic(expected = "InvalidFeeBps")]
fn test_bps_not_10000_rejected() {
    let t = TestEnv::setup();
    let id = t.reach_in_transit();
    let dispute_id = t.client.raise_dispute(
        &t.shipper, &id, &String::from_str(&t.env, "Dispute"),
    );
    t.client.resolve_dispute(&dispute_id, &6_000u32, &3_000u32);
}

// ── Platform fees ──────────────────────────────────────────────────────────

#[test]
fn test_fee_accumulation_and_withdrawal() {
    let t = TestEnv::setup();
    let id = t.reach_delivered();
    t.client.confirm_delivery(&id);

    // 1% of 500_000_000 = 5_000_000
    assert_eq!(t.client.get_accumulated_fees(), 5_000_000i128);

    let recipient = Address::generate(&t.env);
    t.client.withdraw_fees(&recipient);
    assert_eq!(t.client.get_accumulated_fees(), 0i128);
}

#[test]
#[should_panic(expected = "NoFeesToWithdraw")]
fn test_withdraw_no_fees_fails() {
    let t = TestEnv::setup();
    t.client.withdraw_fees(&Address::generate(&t.env));
}

// ── Pause / Unpause ────────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "ContractPaused")]
fn test_paused_rejects_ops() {
    let t = TestEnv::setup();
    t.client.pause_contract();
    t.client.register_cargo(
        &t.shipper, &t.carrier, &t.consignee,
        &String::from_str(&t.env, "Goods"), &100i128, &t.doc_hash(),
    );
}

#[test]
fn test_unpause_restores_ops() {
    let t = TestEnv::setup();
    t.client.pause_contract();
    t.client.unpause_contract();
    assert!(t.client.health());
}
