import type { ShipmentStatus } from "@/types/shipment";

const STYLES: Record<ShipmentStatus, string> = {
  Registered: "bg-slate-100 text-slate-600",
  Funded:     "bg-blue-50  text-blue-700 ring-1 ring-blue-200",
  Accepted:   "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  InTransit:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Delivered:  "bg-teal-50  text-teal-700 ring-1 ring-teal-200",
  Closed:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Disputed:   "bg-red-50   text-red-700 ring-1 ring-red-200",
  Resolved:   "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

const LABELS: Record<ShipmentStatus, string> = {
  Registered: "Registered",
  Funded:     "Funded",
  Accepted:   "Accepted",
  InTransit:  "In Transit",
  Delivered:  "Delivered",
  Closed:     "Closed",
  Disputed:   "Disputed",
  Resolved:   "Resolved",
};

interface Props {
  status: ShipmentStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
