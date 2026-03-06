import type { VaccinationRecommendation, VaccinationStatus } from "@/lib/cdc";

interface CdcComplianceRowProps {
  recommendation: VaccinationRecommendation;
}

const STATUS_BADGE: Record<
  VaccinationStatus,
  { label: string; classes: string }
> = {
  up_to_date: { label: "Up to date", classes: "bg-green-100 text-green-700" },
  due: { label: "Due", classes: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", classes: "bg-red-100 text-red-700" },
  not_applicable: { label: "N/A", classes: "bg-gray-100 text-gray-400" },
};

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export function CdcComplianceRow({ recommendation }: CdcComplianceRowProps) {
  const badge = STATUS_BADGE[recommendation.status];
  const dimmed = recommendation.status === "not_applicable";

  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
        dimmed ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{recommendation.vaccine}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>
        {recommendation.notes && (
          <p className="mt-0.5 text-xs text-gray-500">{recommendation.notes}</p>
        )}
      </div>
      <div className="flex gap-6 text-sm text-gray-500 shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-400">Last dose</p>
          <p className="font-medium text-gray-700">{fmtDate(recommendation.lastDoseDate)}</p>
        </div>
        {recommendation.nextDueDate && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Next due</p>
            <p className="font-medium text-gray-700">{fmtDate(recommendation.nextDueDate)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
