"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { getDispute } from "@/lib/contract";
import { raiseDispute } from "@/lib/contract";
import type { Dispute } from "@/types/shipment";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shipment?: string }>;
}

export default function DisputePage({ params, searchParams }: Props) {
  const { id } = use(params);
  const { shipment: shipmentId } = use(searchParams);
  const isNew = id === "new";

  if (isNew && shipmentId) return <RaiseDisputeForm shipmentId={shipmentId} />;
  return <DisputeDetail disputeId={id} />;
}

// ── Raise dispute form ──────────────────────────────────────────────────────

function RaiseDisputeForm({ shipmentId }: { shipmentId: string }) {
  const { address, isConnected, signTransaction } = useWallet();
  const { txState, execute, reset } = useContract();
  const [reason, setReason] = useState("");

  const isSubmitting = ["building", "signing", "submitting"].includes(txState.status);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    await execute(
      () => raiseDispute(address, BigInt(shipmentId), reason),
      signTransaction
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <Link href={`/shipments/${shipmentId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-flex items-center gap-1">
        ← Back to Shipment
      </Link>
      <h1 className="page-header mb-2">Raise Dispute</h1>
      <p className="text-sm text-slate-500 mb-8">
        Shipment #{shipmentId} · This will freeze escrow pending arbitration.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="reason" className="label">
              Reason for dispute <span className="text-red-500" aria-hidden>*</span>
            </label>
            <textarea
              id="reason"
              className="input min-h-[120px] resize-none"
              placeholder="Describe the issue in detail — damage, non-delivery, incorrect goods…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={20}
              maxLength={512}
            />
            <p className="mt-1 text-xs text-slate-500 text-right">
              {reason.length}/512
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Note:</strong> Once raised, the shipment enters Disputed
            status and escrow is frozen. An arbitrator will review and split
            payment.
          </div>

          {txState.status === "error" && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {txState.error}{" "}
              <button type="button" onClick={reset} className="underline text-xs">Dismiss</button>
            </p>
          )}
          {txState.status === "success" && (
            <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              ✓ Dispute raised on-chain. The arbitrator has been notified.
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={!isConnected || isSubmitting || reason.length < 20}
          >
            {isSubmitting ? "Submitting…" : "Raise Dispute On-Chain"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dispute detail view ─────────────────────────────────────────────────────

function DisputeDetail({ disputeId }: { disputeId: string }) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDispute(BigInt(disputeId))
      .then(setDispute)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsLoading(false));
  }, [disputeId]);

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="card h-64 bg-slate-100" /></div>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p></div>;
  if (!dispute) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500 text-sm">Dispute #{disputeId} not found.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <div>
        <Link href={`/shipments/${dispute.shipment_id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-flex items-center gap-1">
          ← Shipment #{String(dispute.shipment_id)}
        </Link>
        <h1 className="page-header flex items-center gap-3">
          Dispute #{disputeId}
          <OutcomeBadge outcome={dispute.outcome} />
        </h1>
      </div>

      <div className="card">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div className="sm:col-span-2">
            <dt className="text-slate-500 mb-1">Reason</dt>
            <dd className="text-slate-900 leading-relaxed">{dispute.reason}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-1">Raised By</dt>
            <dd className="font-mono text-xs text-slate-700 break-all">{dispute.raised_by}</dd>
          </div>
          <div>
            <dt className="text-slate-500 mb-1">Opened Ledger</dt>
            <dd className="font-medium text-slate-900">#{dispute.opened_ledger.toLocaleString()}</dd>
          </div>

          {dispute.outcome !== "Pending" && (
            <>
              <div>
                <dt className="text-slate-500 mb-1">Carrier Award</dt>
                <dd className="font-medium text-slate-900">{dispute.carrier_bps / 100}%</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">Shipper Refund</dt>
                <dd className="font-medium text-slate-900">{dispute.shipper_bps / 100}%</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">Resolved Ledger</dt>
                <dd className="font-medium text-slate-900">#{dispute.resolved_ledger.toLocaleString()}</dd>
              </div>
            </>
          )}

          {dispute.outcome === "Pending" && (
            <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Awaiting arbitrator decision. Escrow is frozen.
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

import type { DisputeOutcome } from "@/types/shipment";

function OutcomeBadge({ outcome }: { outcome: DisputeOutcome }) {
  const styles: Record<DisputeOutcome, string> = {
    Pending:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    CarrierWins: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    ShipperWins: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Split:       "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  };
  const labels: Record<DisputeOutcome, string> = {
    Pending: "Pending",
    CarrierWins: "Carrier Wins",
    ShipperWins: "Shipper Wins",
    Split: "Split",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[outcome]}`}>
      {labels[outcome]}
    </span>
  );
}
