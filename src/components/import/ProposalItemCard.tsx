"use client";

import type { ProposalItem } from "@/lib/ai-import/types";

const ENTITY_LABELS: Record<string, string> = {
  facility: "Facility",
  location: "Location",
  doctor: "Provider",
  visit: "Visit",
  medication: "Medication",
  condition: "Condition",
  allergy: "Allergy",
  vaccination: "Vaccination",
  health_metric: "Health Metric",
};

const ACTION_BADGES: Record<
  ProposalItem["action"],
  { label: string; className: string }
> = {
  create: { label: "New", className: "bg-green-100 text-green-700" },
  update: { label: "Update", className: "bg-blue-100 text-blue-700" },
  merge_candidate: { label: "Possible Duplicate", className: "bg-amber-100 text-amber-700" },
};

function FieldDiff({ field, current, proposed }: { field: string; current: unknown; proposed: unknown }) {
  if (field.startsWith("_")) return null; // internal tracking fields
  const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {current !== undefined && current !== null && (
          <span className="line-through text-red-500">{String(current)}</span>
        )}
        {current !== undefined && current !== null && (
          <span className="text-gray-400">→</span>
        )}
        <span className="text-green-600 font-medium">{String(proposed)}</span>
      </div>
    </div>
  );
}

function DataPreview({ data }: { data: Record<string, unknown> }) {
  const fields = Object.entries(data).filter(
    ([k, v]) => !k.startsWith("_") && v !== undefined && v !== null && v !== "" && k !== "profileId"
  );
  if (fields.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {fields.map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        return (
          <div key={k} className="text-xs text-gray-600">
            <span className="font-medium text-gray-500">{label}: </span>
            {String(v)}
          </div>
        );
      })}
    </div>
  );
}

export function ProposalItemCard({
  item,
  onToggle,
  onMergeChoice,
}: {
  item: ProposalItem;
  onToggle: (id: string) => void;
  onMergeChoice?: (id: string, keepExisting: boolean) => void;
}) {
  const badge = ACTION_BADGES[item.action];
  const isApproved = item.status === "approved";
  const isRejected = item.status === "rejected";

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isRejected
          ? "border-gray-100 bg-gray-50 opacity-50"
          : isApproved
          ? "border-indigo-200 bg-indigo-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {ENTITY_LABELS[item.entityType] ?? item.entityType}
            </span>
          </div>

          {/* Label */}
          <p className="mt-1 font-medium text-gray-900 text-sm">{item.label}</p>

          {/* CREATE: show data preview */}
          {item.action === "create" && item.data && (
            <DataPreview data={item.data} />
          )}

          {/* UPDATE: show before/after diff */}
          {item.action === "update" && item.changedFields && item.proposedChanges && (
            <div className="mt-2 space-y-1.5">
              {item.changedFields
                .filter((f) => !f.startsWith("_"))
                .map((field) => (
                  <FieldDiff
                    key={field}
                    field={field}
                    current={item.currentData?.[field]}
                    proposed={item.proposedChanges![field]}
                  />
                ))}
            </div>
          )}

          {/* MERGE_CANDIDATE: show comparison + choice */}
          {item.action === "merge_candidate" && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">
                Found similar in your records:{" "}
                <span className="font-medium text-gray-700">{item.existingName}</span>
              </p>
              {item.recommendation && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  AI suggests: {item.recommendation}
                </p>
              )}
              {isApproved && onMergeChoice && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => onMergeChoice(item.id, true)}
                    className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50"
                  >
                    Keep: &ldquo;{item.existingName}&rdquo;
                  </button>
                  <button
                    onClick={() => onMergeChoice(item.id, false)}
                    className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50"
                  >
                    Use new: &ldquo;{item.extractedName}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Approve / Decline toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (item.status !== "approved") onToggle(item.id);
            }}
            title="Approve"
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
              isApproved
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-600"
            }`}
          >
            ✓
          </button>
          <button
            onClick={() => {
              if (item.status !== "rejected") onToggle(item.id);
            }}
            title="Decline"
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
              isRejected
                ? "bg-red-100 text-red-600 border border-red-300"
                : "border border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500"
            }`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
