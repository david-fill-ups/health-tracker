"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";

type FamilyRelationship = "FATHER" | "MOTHER" | "BROTHER" | "SISTER" | "HALF_BROTHER" | "HALF_SISTER" | "GRANDFATHER" | "GRANDMOTHER" | "AUNT" | "UNCLE" | "SON" | "DAUGHTER";
type FamilySide = "MATERNAL" | "PATERNAL";

type ExistingMember = { relationship: FamilyRelationship; side?: FamilySide | null };

const SIDE_APPLICABLE: FamilyRelationship[] = ["GRANDFATHER", "GRANDMOTHER", "AUNT", "UNCLE"];
// Relationships where only one member per side is meaningful (used for smart defaults + disabling)
const UNIQUE_PER_SIDE: FamilyRelationship[] = ["GRANDFATHER", "GRANDMOTHER"];

export default function NewFamilyMemberPage() {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship | "">("");
  const [side, setSide] = useState<FamilySide | "">("");
  const [notes, setNotes] = useState("");

  const [existingMembers, setExistingMembers] = useState<ExistingMember[]>([]);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/family-members?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setExistingMembers(data as ExistingMember[]);
      })
      .catch(() => {}); // fail silently — smart defaults just won't apply
  }, [activeProfileId]);

  // Relationships that are fully taken and should be disabled
  const disabledRelationships = useMemo(() => {
    const disabled = new Set<FamilyRelationship>();
    if (existingMembers.some((m) => m.relationship === "FATHER")) disabled.add("FATHER");
    if (existingMembers.some((m) => m.relationship === "MOTHER")) disabled.add("MOTHER");
    for (const rel of UNIQUE_PER_SIDE) {
      const existing = existingMembers.filter((m) => m.relationship === rel);
      const hasMat = existing.some((m) => m.side === "MATERNAL");
      const hasPat = existing.some((m) => m.side === "PATERNAL");
      if (hasMat && hasPat) disabled.add(rel);
    }
    return disabled;
  }, [existingMembers]);

  function getDisabledSides(rel: FamilyRelationship): Set<FamilySide> {
    const disabled = new Set<FamilySide>();
    if (!UNIQUE_PER_SIDE.includes(rel)) return disabled;
    const existing = existingMembers.filter((m) => m.relationship === rel);
    if (existing.some((m) => m.side === "MATERNAL")) disabled.add("MATERNAL");
    if (existing.some((m) => m.side === "PATERNAL")) disabled.add("PATERNAL");
    return disabled;
  }

  function getSmartDefaultSide(rel: FamilyRelationship): FamilySide | "" {
    if (!UNIQUE_PER_SIDE.includes(rel)) return "";
    const existing = existingMembers.filter((m) => m.relationship === rel);
    const hasMat = existing.some((m) => m.side === "MATERNAL");
    const hasPat = existing.some((m) => m.side === "PATERNAL");
    if (hasMat && !hasPat) return "PATERNAL";
    if (hasPat && !hasMat) return "MATERNAL";
    return "";
  }

  const showSide = relationship !== "" && SIDE_APPLICABLE.includes(relationship as FamilyRelationship);
  const disabledSides = relationship !== "" ? getDisabledSides(relationship as FamilyRelationship) : new Set<FamilySide>();

  function handleRelationshipChange(val: string) {
    const rel = val as FamilyRelationship | "";
    setRelationship(rel);
    if (!rel || !SIDE_APPLICABLE.includes(rel as FamilyRelationship)) {
      setSide("");
    } else {
      setSide(getSmartDefaultSide(rel as FamilyRelationship));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId || !relationship) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          name,
          relationship,
          side: side || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save family member");
        return;
      }

      const member = await res.json();
      setSaved(true);
      setTimeout(() => { router.push(`/family-history/${member.id}/edit`); router.refresh(); }, 1000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/family-history" className="text-sm text-indigo-600 hover:underline">
          ← Back to Family History
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add Family Member</h1>
      </div>

      {!activeProfileId ? (
        <p className="text-sm text-gray-500">Select a profile first.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Robert Smith"
            />
          </div>

          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship <span className="text-red-500">*</span>
            </label>
            <select
              id="relationship"
              required
              value={relationship}
              onChange={(e) => handleRelationshipChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>— Select relationship —</option>
              <optgroup label="Parents">
                <option value="FATHER" disabled={disabledRelationships.has("FATHER")}>
                  Father{disabledRelationships.has("FATHER") ? " (already added)" : ""}
                </option>
                <option value="MOTHER" disabled={disabledRelationships.has("MOTHER")}>
                  Mother{disabledRelationships.has("MOTHER") ? " (already added)" : ""}
                </option>
              </optgroup>
              <optgroup label="Siblings">
                <option value="BROTHER">Brother</option>
                <option value="SISTER">Sister</option>
                <option value="HALF_BROTHER">Half-Brother</option>
                <option value="HALF_SISTER">Half-Sister</option>
              </optgroup>
              <optgroup label="Grandparents">
                <option value="GRANDFATHER" disabled={disabledRelationships.has("GRANDFATHER")}>
                  Grandfather{disabledRelationships.has("GRANDFATHER") ? " (both sides added)" : ""}
                </option>
                <option value="GRANDMOTHER" disabled={disabledRelationships.has("GRANDMOTHER")}>
                  Grandmother{disabledRelationships.has("GRANDMOTHER") ? " (both sides added)" : ""}
                </option>
              </optgroup>
              <optgroup label="Aunts &amp; Uncles">
                <option value="AUNT">Aunt</option>
                <option value="UNCLE">Uncle</option>
              </optgroup>
              <optgroup label="Children">
                <option value="SON">Son</option>
                <option value="DAUGHTER">Daughter</option>
              </optgroup>
            </select>
          </div>

          {showSide && (
            <div>
              <label htmlFor="side" className="block text-sm font-medium text-gray-700 mb-1">
                Side <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="side"
                value={side}
                onChange={(e) => setSide(e.target.value as FamilySide | "")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">—</option>
                <option value="MATERNAL" disabled={disabledSides.has("MATERNAL")}>
                  Maternal{disabledSides.has("MATERNAL") ? " (already added)" : ""}
                </option>
                <option value="PATERNAL" disabled={disabledSides.has("PATERNAL")}>
                  Paternal{disabledSides.has("PATERNAL") ? " (already added)" : ""}
                </option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional notes about this family member"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !relationship}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : submitting ? "Saving…" : "Add family member"}
            </button>
            <a
              href="/family-history"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
      <Toast message={saved ? "Family member added" : null} onDismiss={() => setSaved(false)} />
    </div>
  );
}
