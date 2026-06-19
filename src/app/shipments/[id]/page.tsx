"use client";

import { use } from "react";
import Link from "next/link";
import { useShipment } from "@/hooks/useShipment";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { StatusBadge } from "@/components/StatusBadge";
import { EscrowCard } from "@/components/EscrowCard";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";
import { confirmDelivery } from "@/lib/contract";
import { formatUsdc } from "@/lib/stellar";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ShipmentPage({ params }: Props) {
  const { id } = use(params);
  const { shipment, milestones, escrowBalance, isLoading, error, refetch } =
    useShipment(id);
  const { address, isConnected, signTransaction } = useWallet();
  const { txState, execute } = useContract();

  async function handleConfirmDelivery() {
    if (!address || !shipment) return;
    const ok = await execute(
      () => confirmDelivery(address, shipment.id),
      signTransaction
    );
    if (ok) refetch();
  }

  if (isLoading) return <LoadingSkeleton />;
  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">
          {error}
        </p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">
          ← Back to Dashboard
        </Link>
      </div>
    );
  if (!shipment)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500 text-sm">
        Shipment #{id} not found.
      </div>
    );

  const isShipper = address === shipment.shipper;
  const isCarrier = address === shipment.carrier;
  const isParty = isShipper || isCarrier;
  const canConfirm = isShipper && shipment.status === "Delivered";
  const canDispute =
    isParty &&
    (shipment.status === "InTransit" || shipment.status === "Delivered") &&
    shipment.dispute_id === null;
  const isSubmitting = ["building", "signing", "submitting"].includes(txState.status);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-flex items-center gap-1">
            ← Dashboard
          </Link>
          <h1 className="page-header flex items-center gap-3">
            Shipment #{id}
            <StatusBadge status={shipment.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500 truncate max-w-md">
            {shipment.goods_description}
          </p>
        </div>

        {canConfirm && (
          <button
            onClick={handleConfirmDelivery}
            disabled={isSubmitting || !isConnected}
            className="btn-primary"
          >
            {isSubmitting ? "Confirming…" : "✓ Confirm Delivery"}
          </button>
        )}
      </div>

      {txState.status === "error" && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {txState.error}
        </p>
      )}
      {txState.status === "success" && (
        <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">
          ✓ Transaction confirmed. Escrow released to carrier.
        </p>
      )}

      {/* Main layout: details + escrow + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Detail label="Shipper" value={shipment.shipper} mono />
              <Detail label="Carrier" value={shipment.carrier} mono />
              <Detail label="Consignee" value={shipment.consignee} mono />
              <Detail label="Freight Value" value={formatUsdc(shipment.freight_value)} />
              <Detail label="Created Ledger" value={`#${shipment.created_ledger.toLocaleString()}`} />
              {shipment.delivered_ledger > 0 && (
                <Detail label="Delivered Ledger" value={`#${shipment.delivered_ledger.toLocaleString()}`} />
              )}
            </dl>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-6">
              Milestones
            </h2>
            <MilestoneTimeline milestones={milestones} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <EscrowCard shipment={shipment} escrowBalance={escrowBalance} />

          {shipment.dispute_id !== null && (
            <Link
              href={`/disputes/${shipment.dispute_id}`}
              className="card flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-sm font-semibold text-red-700">Active Dispute</p>
                <p className="text-xs text-slate-500">ID #{String(shipment.dispute_id)}</p>
              </div>
              <span aria-hidden>→</span>
            </Link>
          )}

          {canDispute && (
            <Link
              href={`/disputes/new?shipment=${id}`}
              className="btn-secondary w-full text-center text-sm"
            >
              Raise Dispute
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-slate-500 mb-0.5">{label}</dt>
      <dd className={`text-slate-900 break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card h-40 bg-slate-100" />
          <div className="card h-64 bg-slate-100" />
        </div>
        <div className="card h-48 bg-slate-100" />
      </div>
    </div>
  );
}
