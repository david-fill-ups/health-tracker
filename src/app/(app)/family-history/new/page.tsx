"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";

type FamilyRelationship = "PARENT" | "SIBLING" | "GRANDFATHER" | "GRANDMOTHER" | "AUNT" | "UNCLE" | "SON" | "DAUGHTER";
type FamilySide = "MATERNAL" | "PATERNAL";

const SIDE_APPLICABLE: FamilyRelationship[] = ["GRANDFATHER", "GRANDMOTHER", "AUNT", "UNCLE"];

export default function NewFamilyMemberPage() {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("PARENT");
  const [side, setSide] = useState<FamilySide | "">("");
  const [notes, setNotes] = useState("");

  const showSide = SIDE_APPLICABLE.includes(relationship);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
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
              value={relationship}
              onChange={(e) => {
                const val = e.target.value as FamilyRelationship;
                setRelationship(val);
                if (!SIDE_APPLICABLE.includes(val)) setSide("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
              <option value="GRANDFATHER">Grandfather</option>
              <option value="GRANDMOTHER">Grandmother</option>
              <option value="AUNT">Aunt</option>
              <option value="UNCLE">Uncle</option>
              <option value="SON">Son</option>
              <option value="DAUGHTER">Daughter</option>
            </select>
          </div>

          {showSide && (
            <div>
              <label htmlFor="side" className="block text-sm font-medium text-gray-700 mb-1">Side (optional)</label>
              <select
                id="side"
                value={side}
                onChange={(e) => setSide(e.target.value as FamilySide | "")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Unknown</option>
                <option value="MATERNAL">Maternal</option>
                <option value="PATERNAL">Paternal</option>
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
              disabled={submitting}
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
