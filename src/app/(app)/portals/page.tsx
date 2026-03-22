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
  active: boolean;
  facility: { id: string; name: string } | null;
}

function PortalCard({
  portal,
  profileId,
  onDelete,
  onToggleActive,
}: {
  portal: Portal;
  profileId: string;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  async function handleDelete() {
    if (!confirm(`Delete "${portal.name}"?`)) return;
    await fetch(`/api/portals/${portal.id}?profileId=${profileId}`, { method: "DELETE" });
    onDelete(portal.id);
  }

  async function handleToggleActive() {
    const res = await fetch(`/api/portals/${portal.id}?profileId=${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !portal.active }),
    });
    if (res.ok) onToggleActive(portal.id, !portal.active);
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-opacity ${portal.active ? "" : "opacity-50"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{portal.name}</p>
            {!portal.active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
            )}
          </div>
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
              Open ↗
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
            onClick={handleToggleActive}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {portal.active ? "Deactivate" : "Activate"}
          </button>
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
  const [inactiveOpen, setInactiveOpen] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/portals?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setPortals(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load pharmacies"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDelete(id: string) {
    setPortals((prev) => prev.filter((p) => p.id !== id));
  }

  function handleToggleActive(id: string, active: boolean) {
    setPortals((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
  }

  const active = portals.filter((p) => p.active);
  const inactive = portals.filter((p) => !p.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
        <Link
          href="/portals/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Pharmacy
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view pharmacies.</p>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {active.length === 0 && inactive.length === 0 ? (
            <p className="text-sm text-gray-500">No pharmacies recorded.</p>
          ) : (
            <div className="space-y-3">
              {active.map((p) => (
                <PortalCard
                  key={p.id}
                  portal={p}
                  profileId={activeProfileId}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setInactiveOpen((v) => !v)}
                className="text-sm text-gray-500 underline"
              >
                {inactiveOpen ? "Hide" : "Show"} inactive ({inactive.length})
              </button>
              {inactiveOpen && (
                <div className="mt-3 space-y-3">
                  {inactive.map((p) => (
                    <PortalCard
                      key={p.id}
                      portal={p}
                      profileId={activeProfileId}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
