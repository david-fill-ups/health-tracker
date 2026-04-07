"use client";

import { useState, useEffect, use, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { vaccineToSlug } from "@/lib/cdc";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";

export default function EditVaccinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [vaccinationId, setVaccinationId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [notes, setNotes] = useState("");

  useBeforeUnload(isDirty && !saved);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/vaccinations?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string; aliases: string[]; notes: string | null }>) => {
        if (!Array.isArray(data)) throw new Error("Bad response");
        const match = data.find((v) => vaccineToSlug(v.name) === slug);
        if (!match) throw new Error("Not found");
        setVaccinationId(match.id);
        setName(match.name);
        setAliases(match.aliases.join(", "));
        setNotes(match.notes ?? "");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeProfileId, slug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!vaccinationId) return;
    setSubmitting(true);
    setError(null);

    const aliasArray = aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/vaccinations/${vaccinationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), aliases: aliasArray, notes: notes || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }

      setSaved(true);
      const newSlug = vaccineToSlug(name.trim());
      setTimeout(() => {
        router.push(`/vaccinations/${newSlug}`);
        router.refresh();
      }, 1000);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!vaccinationId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vaccinations/${vaccinationId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.push("/vaccinations");
        router.refresh();
      } else {
        setError("Failed to delete vaccination record");
        setConfirmDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  if (error && !vaccinationId) {
    return (
      <div className="max-w-2xl">
        <a href="/vaccinations" className="text-sm text-indigo-600 hover:underline">← Back</a>
        <p className="mt-4 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href={`/vaccinations/${slug}`} className="text-sm text-indigo-600 hover:underline">
          ← Back
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Vaccination</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Vaccine name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="aliases" className="block text-sm font-medium text-gray-700 mb-1">
            Also known as <span className="text-gray-400 text-xs ml-1">(comma-separated)</span>
          </label>
          <input
            id="aliases"
            type="text"
            value={aliases}
            onChange={(e) => { setAliases(e.target.value); setIsDirty(true); }}
            placeholder="e.g. Flu Shot, Influenza Vaccine"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || saved}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saved ? "Saved!" : submitting ? "Saving…" : "Save changes"}
          </button>
          <a
            href={`/vaccinations/${slug}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">Delete all doses too?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
