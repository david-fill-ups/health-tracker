"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";

interface Facility {
  id: string;
  name: string;
}

export default function NewPortalPage() {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [url, setUrl] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/facilities?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeProfileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          name,
          organization: organization || undefined,
          url,
          facilityId: facilityId || undefined,
          notes: notes || undefined,
          active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }

      router.push("/portals");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/portals" className="text-sm text-indigo-600 hover:underline">
          ← Back to Pharmacies
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New Pharmacy</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. CVS Pharmacy, Walgreens, Express Scripts"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated facility <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— None —</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="portal-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="portal-active" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add pharmacy"}
            </button>
            <a
              href="/portals"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
