import type { Milestone, MilestoneStatus } from "@/types/shipment";

const ICONS: Record<MilestoneStatus, string> = {
  PickedUp:      "🏭",
  InTransit:     "🚢",
  CustomsCleared:"🛃",
  AtDeliveryHub: "🏪",
  Delivered:     "✅",
  Evidence:      "📎",
};

const LABELS: Record<MilestoneStatus, string> = {
  PickedUp:      "Picked Up",
  InTransit:     "In Transit",
  CustomsCleared:"Customs Cleared",
  AtDeliveryHub: "At Delivery Hub",
  Delivered:     "Delivered",
  Evidence:      "Evidence Submitted",
};

interface Props {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: Props) {
  if (milestones.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No milestones posted yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-6 ml-3" aria-label="Shipment milestones">
      {milestones.map((m, i) => (
        <li key={i} className="ml-8">
          <span
            className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-base shadow-sm"
            aria-hidden
          >
            {ICONS[m.status]}
          </span>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900 text-sm">
                {LABELS[m.status]}
              </p>
              {m.location && (
                <p className="text-xs text-slate-500 mt-0.5">{m.location}</p>
              )}
              {m.doc_hash && (
                <p className="font-mono text-xs text-slate-400 mt-1 truncate max-w-xs">
                  {m.doc_hash}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-slate-400">
              Ledger #{m.ledger.toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
