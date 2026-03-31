"use client";

import { useState } from "react";
import { ProposalItemCard } from "./ProposalItemCard";
import type { ProposalItem, EntityType } from "@/lib/ai-import/types";

const ENTITY_GROUP_LABELS: Partial<Record<EntityType, string>> = {
  facility: "Facilities",
  location: "Locations",
  doctor: "Providers",
  visit: "Visits",
  medication: "Medications",
  condition: "Conditions",
  allergy: "Allergies",
  vaccination: "Vaccinations",
  health_metric: "Health Metrics",
};

const ENTITY_ORDER: EntityType[] = [
  "facility",
  "location",
  "doctor",
  "visit",
  "medication",
  "condition",
  "allergy",
  "vaccination",
  "health_metric",
];

interface ProposalReviewStepProps {
  items: ProposalItem[];
  skippedCount: number;
  warnings?: string[];
  onItemsChange: (items: ProposalItem[]) => void;
  onConfirm: () => void;
  onRevise: (feedback: string) => void;
  isApplying?: boolean;
  isRevising?: boolean;
}

export function ProposalReviewStep({
  items,
  skippedCount,
  warnings,
  onItemsChange,
  onConfirm,
  onRevise,
  isApplying,
  isRevising,
}: ProposalReviewStepProps) {
  const [revisionText, setRevisionText] = useState("");

  const approvedCount = items.filter((i) => i.status === "approved").length;

  function toggleItem(id: string) {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const next =
          item.status === "pending"
            ? "approved"
            : item.status === "approved"
            ? "rejected"
            : "pending";
        return { ...item, status: next };
      })
    );
  }

  function handleMergeChoice(id: string, keepExisting: boolean) {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        if (!keepExisting) {
          // Update existing record's name to the extracted one
          return {
            ...item,
            action: "update" as const,
            proposedChanges: { name: item.extractedName },
            changedFields: ["name"],
          };
        }
        // Keep existing → just merge enriched data (phone/NPI etc.), no name change
        return item;
      })
    );
  }

  function setGroupStatus(entityType: EntityType, status: ProposalItem["status"]) {
    onItemsChange(
      items.map((item) => (item.entityType === entityType ? { ...item, status } : item))
    );
  }

  // Group items by entity type
  const groups = ENTITY_ORDER.map((type) => ({
    type,
    label: ENTITY_GROUP_LABELS[type] ?? type,
    items: items.filter((i) => i.entityType === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex flex-wrap gap-4 text-sm">
        <span className="text-gray-700">
          <strong>{items.length}</strong> item{items.length !== 1 ? "s" : ""} to review
        </span>
        {skippedCount > 0 && (
          <span className="text-gray-500">
            {skippedCount} already in your records (skipped)
          </span>
        )}
        {approvedCount > 0 && (
          <span className="text-indigo-700 font-medium">
            {approvedCount} approved
          </span>
        )}
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
          {warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      {/* No items */}
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No new items found in the uploaded documents.
        </div>
      )}

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.type}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGroupStatus(group.type, "approved")}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Approve all
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setGroupStatus(group.type, "rejected")}
                className="text-xs text-gray-500 hover:text-red-500"
              >
                Decline all
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <ProposalItemCard
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onMergeChoice={handleMergeChoice}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Revision section */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Request changes from AI
        </label>
        <textarea
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          placeholder={'e.g. "The medication should be marked inactive" or "The facility is a Hospital, not a Clinic"'}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          disabled={!revisionText.trim() || isRevising}
          onClick={() => {
            onRevise(revisionText.trim());
            setRevisionText("");
          }}
          className="w-full rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRevising ? "Re-analyzing…" : "Re-analyze with Feedback"}
        </button>
      </div>

      {/* Confirm button */}
      <button
        type="button"
        disabled={approvedCount === 0 || isApplying || isRevising}
        onClick={onConfirm}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isApplying
          ? "Saving…"
          : `Confirm ${approvedCount} Approved Item${approvedCount !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
