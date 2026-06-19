import { formatUsdc } from "@/lib/stellar";
import type { Shipment } from "@/types/shipment";

interface Props {
  shipment: Shipment;
  escrowBalance: bigint;
}

export function EscrowCard({ shipment, escrowBalance }: Props) {
  const pct =
    shipment.freight_value > 0n
      ? Number((escrowBalance * 100n) / shipment.freight_value)
      : 0;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
        Escrow
      </h3>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-slate-900">
            {formatUsdc(escrowBalance)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            of {formatUsdc(shipment.freight_value)} locked
          </p>
        </div>
        <span className="text-sm font-semibold text-brand-600">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-2 rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Shipper</dt>
          <dd className="font-mono text-xs text-slate-700 truncate">
            {shipment.shipper.slice(0, 8)}…
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Carrier</dt>
          <dd className="font-mono text-xs text-slate-700 truncate">
            {shipment.carrier.slice(0, 8)}…
          </dd>
        </div>
      </dl>
    </div>
  );
}
