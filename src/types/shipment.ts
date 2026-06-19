// NOTE: Soroban u64 fields (id, shipment_id, dispute_id, completed, disputed)
// are returned by scValToNative as JS number, not BigInt.
// They are typed as number here. For arithmetic on large values use BigInt(x).

export type ShipmentStatus =
  | "Registered"
  | "Funded"
  | "Accepted"
  | "InTransit"
  | "Delivered"
  | "Closed"
  | "Disputed"
  | "Resolved";

export type MilestoneStatus =
  | "PickedUp"
  | "InTransit"
  | "CustomsCleared"
  | "AtDeliveryHub"
  | "Delivered"
  | "Evidence";

export type DisputeOutcome =
  | "Pending"
  | "CarrierWins"
  | "ShipperWins"
  | "Split";

export interface Shipment {
  id: number;
  shipper: string;
  carrier: string;
  consignee: string;
  goods_description: string;
  /** i128 returned as string by scValToNative to avoid JS precision loss. */
  freight_value: string;
  doc_hash: string;
  status: ShipmentStatus;
  created_ledger: number;
  /** null when not yet delivered */
  delivered_ledger: number | null;
  dispute_id: number | null;
}

export interface Milestone {
  shipment_id: number;
  index: number;
  status: MilestoneStatus;
  location: string;
  doc_hash: string | null;
  ledger: number;
}

export interface Dispute {
  id: number;
  shipment_id: number;
  raised_by: string;
  reason: string;
  outcome: DisputeOutcome;
  carrier_bps: number;
  shipper_bps: number;
  opened_ledger: number;
  resolved_ledger: number;
}

export interface CarrierStats {
  completed: number;
  disputed: number;
}

export interface ShipmentSummary {
  id: string;
  goods_description: string;
  status: ShipmentStatus;
  freight_value: string;
  shipper: string;
  carrier: string;
  created_ledger: number;
}
