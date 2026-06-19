use soroban_sdk::{contracttype, Address, BytesN, String};

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ShipmentStatus {
    Registered,
    Funded,
    Accepted,
    InTransit,
    Delivered,
    Closed,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum MilestoneStatus {
    PickedUp,
    InTransit,
    CustomsCleared,
    AtDeliveryHub,
    Delivered,
    Evidence,
}

#[contracttype]
#[derive(Clone)]
pub struct Shipment {
    pub id: u64,
    pub shipper: Address,
    pub carrier: Address,
    pub consignee: Address,
    pub goods_description: String,
    pub freight_value: i128,
    pub doc_hash: BytesN<32>,
    pub status: ShipmentStatus,
    pub created_ledger: u32,
    pub delivered_ledger: Option<u32>,
    pub dispute_id: Option<u64>,
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub shipment_id: u64,
    pub index: u32,
    pub status: MilestoneStatus,
    pub location: String,
    pub doc_hash: Option<BytesN<32>>,
    pub ledger: u32,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum DisputeOutcome {
    Pending,
    CarrierWins,
    ShipperWins,
    Split,
}

#[contracttype]
#[derive(Clone)]
pub struct Dispute {
    pub id: u64,
    pub shipment_id: u64,
    pub raised_by: Address,
    pub reason: String,
    pub outcome: DisputeOutcome,
    pub carrier_bps: u32,
    pub shipper_bps: u32,
    pub opened_ledger: u32,
    pub resolved_ledger: u32,
}

#[contracttype]
#[derive(Clone, Default)]
pub struct CarrierStats {
    pub completed: u64,
    pub disputed: u64,
}
