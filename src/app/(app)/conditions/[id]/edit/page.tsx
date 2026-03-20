"use client";

import { useState, useEffect, use, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";

export default function EditConditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [diagnosisDate, setDiagnosisDate] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "MONITORING" | "RESOLVED">("ACTIVE");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/conditions/${id}?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setDiagnosisDate(data.diagnosisDate ? data.diagnosisDate.slice(0, 10) : "");
        setStatus(data.status ?? "ACTIVE");
        setNotes(data.notes ?? "");
      })
      .catch(() => setError("Failed to load condition"))
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/conditions/${id}?profileId=${activeProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          diagnosisDate: diagnosisDate || undefined,
          status,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save condition");
        return;
      }

      router.push("/conditions");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/conditions" className="text-sm text-indigo-600 hover:underline">
          ← Back to Conditions
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Condition</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Diagnosis date
          </label>
          <input
            type="date"
            value={diagnosisDate}
            onChange={(e) => setDiagnosisDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "ACTIVE" | "MONITORING" | "RESOLVED")
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="MONITORING">Monitoring</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <a
            href="/conditions"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
