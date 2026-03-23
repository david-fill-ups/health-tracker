"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";

type FamilyRelationship = "PARENT" | "SIBLING" | "GRANDFATHER" | "GRANDMOTHER" | "AUNT" | "UNCLE" | "SON" | "DAUGHTER";
type FamilySide = "MATERNAL" | "PATERNAL";

const SIDE_APPLICABLE: FamilyRelationship[] = ["GRANDFATHER", "GRANDMOTHER", "AUNT", "UNCLE"];

interface FamilyCondition {
  id: string;
  name: string;
  notes: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  side: FamilySide | null;
  notes: string | null;
  conditions: FamilyCondition[];
}

export default function EditFamilyMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Member form
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<FamilyRelationship>("PARENT");
  const [side, setSide] = useState<FamilySide | "">("");
  const [notes, setNotes] = useState("");

  const showSide = SIDE_APPLICABLE.includes(relationship);
  const [savingMember, setSavingMember] = useState(false);
  const [memberSaved, setMemberSaved] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Conditions
  const [conditions, setConditions] = useState<FamilyCondition[]>([]);
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [editConditionForm, setEditConditionForm] = useState<{ name: string; notes: string } | null>(null);
  const [conditionSaving, setConditionSaving] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newCondition, setNewCondition] = useState({ name: "", notes: "" });
  const [addingError, setAddingError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/family-members/${id}?profileId=${activeProfileId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data: FamilyMember | null) => {
        if (!data) return;
        setName(data.name);
        setRelationship(data.relationship);
        setSide(data.side ?? "");
        setNotes(data.notes ?? "");
        setConditions(data.conditions);
      })
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  async function handleSaveMember() {
    if (!activeProfileId) return;
    setSavingMember(true);
    setMemberError(null);
    try {
      const res = await fetch(`/api/family-members/${id}?profileId=${activeProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, relationship, side: side || undefined, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMemberError(data.error ?? "Failed to save");
        return;
      }
      setMemberSaved(true);
    } finally {
      setSavingMember(false);
    }
  }

  async function handleDeleteMember() {
    if (!activeProfileId || !confirm("Delete this family member and all their conditions? This cannot be undone.")) return;
    const res = await fetch(`/api/family-members/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    if (res.ok) { router.push("/family-history"); router.refresh(); }
  }

  function startEditCondition(cond: FamilyCondition) {
    setEditingConditionId(cond.id);
    setConditionError(null);
    setEditConditionForm({ name: cond.name, notes: cond.notes ?? "" });
    setAddingNew(false);
  }

  function cancelEditCondition() {
    setEditingConditionId(null);
    setEditConditionForm(null);
    setConditionError(null);
  }

  async function saveEditCondition() {
    if (!editConditionForm || !editingConditionId || !activeProfileId) return;
    setConditionSaving(true);
    setConditionError(null);
    try {
      const res = await fetch(
        `/api/family-members/${id}/conditions/${editingConditionId}?profileId=${activeProfileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editConditionForm.name,
            notes: editConditionForm.notes || undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      const updated: FamilyCondition = await res.json();
      setConditions((prev) => prev.map((c) => (c.id === editingConditionId ? updated : c)));
      cancelEditCondition();
    } catch (err) {
      setConditionError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setConditionSaving(false);
    }
  }

  async function deleteCondition(conditionId: string) {
    if (!activeProfileId || !confirm("Delete this condition?")) return;
    const res = await fetch(
      `/api/family-members/${id}/conditions/${conditionId}?profileId=${activeProfileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setConditions((prev) => prev.filter((c) => c.id !== conditionId));
      if (editingConditionId === conditionId) cancelEditCondition();
    }
  }

  async function handleAddCondition() {
    if (!activeProfileId || !newCondition.name.trim()) return;
    setConditionSaving(true);
    setAddingError(null);
    try {
      const res = await fetch(`/api/family-members/${id}/conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          name: newCondition.name.trim(),
          notes: newCondition.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddingError(data.error ?? "Failed to add condition");
        return;
      }
      const created: FamilyCondition = await res.json();
      setConditions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCondition({ name: "", notes: "" });
      setAddingNew(false);
    } finally {
      setConditionSaving(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (notFound) return <p className="text-sm text-red-600">Family member not found.</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <a href="/family-history" className="text-sm text-indigo-600 hover:underline">
          ← Back to Family History
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Family Member</h1>
      </div>

      {/* ── Member form ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
        {memberError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {memberError}
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
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSaveMember}
            disabled={savingMember}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingMember ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={handleDeleteMember}
            className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete family member
          </button>
        </div>
      </div>

      {/* ── Conditions table ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Conditions</h2>
          {!addingNew && (
            <button
              onClick={() => { setAddingNew(true); setEditingConditionId(null); setEditConditionForm(null); }}
              className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              + Add condition
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Condition</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conditions.map((cond) =>
                editingConditionId === cond.id && editConditionForm ? (
                  <tr key={cond.id} className="bg-indigo-50/40">
                    <td colSpan={3} className="px-4 py-3">
                      <div className="space-y-3">
                        {conditionError && (
                          <p className="text-xs text-red-600">{conditionError}</p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Condition name</label>
                            <input
                              type="text"
                              value={editConditionForm.name}
                              onChange={(e) => setEditConditionForm((f) => f && { ...f, name: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                            <input
                              type="text"
                              value={editConditionForm.notes}
                              onChange={(e) => setEditConditionForm((f) => f && { ...f, notes: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditCondition}
                            disabled={conditionSaving}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {conditionSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEditCondition}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => deleteCondition(cond.id)}
                            className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={cond.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => startEditCondition(cond)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{cond.name}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{cond.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">click to edit</td>
                  </tr>
                )
              )}

              {/* Add new condition inline row */}
              {addingNew && (
                <tr className="bg-green-50/40">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="space-y-3">
                      {addingError && (
                        <p className="text-xs text-red-600">{addingError}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Condition name</label>
                          <input
                            type="text"
                            autoFocus
                            value={newCondition.name}
                            onChange={(e) => setNewCondition((f) => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. Heart Disease"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                          <input
                            type="text"
                            value={newCondition.notes}
                            onChange={(e) => setNewCondition((f) => ({ ...f, notes: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCondition}
                          disabled={conditionSaving || !newCondition.name.trim()}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {conditionSaving ? "Adding…" : "Add"}
                        </button>
                        <button
                          onClick={() => { setAddingNew(false); setNewCondition({ name: "", notes: "" }); setAddingError(null); }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {conditions.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400 italic">
                    No conditions recorded. Click &ldquo;+ Add condition&rdquo; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Toast message={memberSaved ? "Changes saved" : null} onDismiss={() => setMemberSaved(false)} />
    </div>
  );
}
