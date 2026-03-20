"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";

interface Portal {
  id: string;
  name: string;
  organization: string | null;
  url: string;
  notes: string | null;
  facility: { id: string; name: string } | null;
}

function PortalCard({
  portal,
  profileId,
  onDelete,
}: {
  portal: Portal;
  profileId: string;
  onDelete: (id: string) => void;
}) {
  async function handleDelete() {
    if (!confirm(`Delete portal "${portal.name}"?`)) return;
    await fetch(`/api/portals/${portal.id}?profileId=${profileId}`, {
      method: "DELETE",
    });
    onDelete(portal.id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{portal.name}</p>
          {portal.organization && (
            <p className="mt-0.5 text-sm text-gray-500">{portal.organization}</p>
          )}
          {portal.facility && (
            <p className="mt-0.5 text-xs text-gray-400">{portal.facility.name}</p>
          )}
          <div className="mt-2">
            <a
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Open Portal ↗
            </a>
          </div>
          {portal.notes && (
            <p className="mt-2 text-sm text-gray-500">{portal.notes}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/portals/${portal.id}/edit`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortalsPage() {
  const { activeProfileId } = useProfile();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/portals?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setPortals(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load portals"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDelete(id: string) {
    setPortals((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Healthcare Portals</h1>
        <Link
          href="/portals/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Portal
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view portals.</p>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {portals.length === 0 ? (
            <p className="text-sm text-gray-500">No portals recorded.</p>
          ) : (
            <div className="space-y-3">
              {portals.map((p) => (
                <PortalCard
                  key={p.id}
                  portal={p}
                  profileId={activeProfileId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
