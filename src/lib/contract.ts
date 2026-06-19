import {
  Contract,
  TransactionBuilder,
  SorobanRpc,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
  Account,
} from "@stellar/stellar-sdk";
import { rpc, networkPassphrase, simulate } from "./stellar";
import { CONTRACT_ID } from "./constants";
import type {
  Shipment,
  Milestone,
  Dispute,
  CarrierStats,
  MilestoneStatus,
} from "@/types/shipment";

const BASE_FEE = "100";

// Reusable fake account for read-only simulations.
// Sequence is set to "0" — valid for simulation, never submitted.
const READ_ONLY_SOURCE = new Account(
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
  "0"
);

async function buildTx(
  sourceAddress: string,
  operation: xdr.Operation
): Promise<string> {
  const account = await rpc.getAccount(sourceAddress);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await simulate(tx);
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR();
}

async function readTx(operation: xdr.Operation): Promise<SorobanRpc.Api.SimulateTransactionSuccessResponse> {
  const tx = new TransactionBuilder(READ_ONLY_SOURCE, { fee: BASE_FEE, networkPassphrase })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  return simulate(tx);
}

const contract = new Contract(CONTRACT_ID);

// ── Shipper ────────────────────────────────────────────────────────────────

export async function registerCargo(
  shipper: string,
  params: {
    carrier: string;
    consignee: string;
    goodsDescription: string;
    freightValue: bigint;
    docHash: Uint8Array;
  }
): Promise<string> {
  const op = contract.call(
    "register_cargo",
    new Address(shipper).toScVal(),
    new Address(params.carrier).toScVal(),
    new Address(params.consignee).toScVal(),
    nativeToScVal(params.goodsDescription, { type: "string" }),
    nativeToScVal(params.freightValue, { type: "i128" }),
    xdr.ScVal.scvBytes(Buffer.from(params.docHash))
  );
  return buildTx(shipper, op);
}

/** Returns the assembled XDR. After signing+submitting, parse shipment ID from result. */
export async function fundEscrow(
  shipper: string,
  shipmentId: bigint,
  amount: bigint
): Promise<string> {
  const op = contract.call(
    "fund_escrow",
    nativeToScVal(shipmentId, { type: "u64" }),
    nativeToScVal(amount, { type: "i128" })
  );
  return buildTx(shipper, op);
}

export async function confirmDelivery(
  shipper: string,
  shipmentId: bigint
): Promise<string> {
  const op = contract.call(
    "confirm_delivery",
    nativeToScVal(shipmentId, { type: "u64" })
  );
  return buildTx(shipper, op);
}

export async function raiseDispute(
  caller: string,
  shipmentId: bigint,
  reason: string
): Promise<string> {
  const op = contract.call(
    "raise_dispute",
    new Address(caller).toScVal(),
    nativeToScVal(shipmentId, { type: "u64" }),
    nativeToScVal(reason, { type: "string" })
  );
  return buildTx(caller, op);
}

// ── Carrier ────────────────────────────────────────────────────────────────

export async function acceptShipment(
  carrier: string,
  shipmentId: bigint
): Promise<string> {
  return buildTx(carrier, contract.call("accept_shipment", nativeToScVal(shipmentId, { type: "u64" })));
}

export async function postMilestone(
  carrier: string,
  shipmentId: bigint,
  status: MilestoneStatus,
  location: string,
  docHash?: Uint8Array
): Promise<string> {
  const op = contract.call(
    "post_milestone",
    nativeToScVal(shipmentId, { type: "u64" }),
    nativeToScVal(status, { type: "symbol" }),
    nativeToScVal(location, { type: "string" }),
    docHash
      ? xdr.ScVal.scvVec([xdr.ScVal.scvBytes(Buffer.from(docHash))])
      : xdr.ScVal.scvVoid()
  );
  return buildTx(carrier, op);
}

export async function submitDeliveryProof(
  carrier: string,
  shipmentId: bigint,
  proofHash: Uint8Array,
  location: string
): Promise<string> {
  const op = contract.call(
    "submit_delivery_proof",
    nativeToScVal(shipmentId, { type: "u64" }),
    xdr.ScVal.scvBytes(Buffer.from(proofHash)),
    nativeToScVal(location, { type: "string" })
  );
  return buildTx(carrier, op);
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getShipment(shipmentId: bigint): Promise<Shipment> {
  const sim = await readTx(contract.call("get_shipment", nativeToScVal(shipmentId, { type: "u64" })));
  return scValToNative(sim.result!.retval) as Shipment;
}

export async function getMilestones(shipmentId: bigint): Promise<Milestone[]> {
  const sim = await readTx(contract.call("get_milestones", nativeToScVal(shipmentId, { type: "u64" })));
  return scValToNative(sim.result!.retval) as Milestone[];
}

export async function getDispute(disputeId: bigint): Promise<Dispute> {
  const sim = await readTx(contract.call("get_dispute", nativeToScVal(disputeId, { type: "u64" })));
  return scValToNative(sim.result!.retval) as Dispute;
}

export async function getEscrowBalance(shipmentId: bigint): Promise<bigint> {
  const sim = await readTx(contract.call("get_escrow_balance", nativeToScVal(shipmentId, { type: "u64" })));
  return BigInt(scValToNative(sim.result!.retval) as number);
}

export async function getCarrierStats(carrier: string): Promise<CarrierStats> {
  const sim = await readTx(contract.call("get_carrier_stats", new Address(carrier).toScVal()));
  return scValToNative(sim.result!.retval) as CarrierStats;
}

/**
 * Parse the shipment ID returned by a successful register_cargo transaction.
 * Call this after submitAndWait to get the on-chain shipment ID.
 */
export function parseShipmentId(
  result: SorobanRpc.Api.GetSuccessfulTransactionResponse
): bigint {
  if (!result.returnValue) throw new Error("No return value in transaction result");
  return BigInt(scValToNative(result.returnValue) as number);
}
