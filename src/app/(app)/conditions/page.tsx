"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import type { ConditionStatus } from "@/generated/prisma/enums";

interface Condition {
  id: string;
  name: string;
  diagnosisDate: string | null;
  status: ConditionStatus;
  notes: string | null;
}

const STATUS_BADGE: Record<ConditionStatus, { label: string; classes: string }> = {
  ACTIVE: { label: "Active", classes: "bg-green-100 text-green-700" },
  MONITORING: { label: "Monitoring", classes: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Resolved", classes: "bg-gray-100 text-gray-500" },
};

function ConditionCard({
  condition,
  profileId,
  onDelete,
}: {
  condition: Condition;
  profileId: string;
  onDelete: (id: string) => void;
}) {
  const badge = STATUS_BADGE[condition.status];

  async function handleDelete() {
    if (!confirm(`Delete condition "${condition.name}"?`)) return;
    await fetch(`/api/conditions/${condition.id}?profileId=${profileId}`, {
      method: "DELETE",
    });
    onDelete(condition.id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{condition.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
              {badge.label}
            </span>
          </div>
          {condition.diagnosisDate && (
            <p className="mt-0.5 text-sm text-gray-500">
              Diagnosed {new Date(condition.diagnosisDate).toLocaleDateString()}
            </p>
          )}
          {condition.notes && (
            <p className="mt-1 text-sm text-gray-500">{condition.notes}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/conditions/${condition.id}/edit`}
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

export default function ConditionsPage() {
  const { activeProfileId } = useProfile();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/conditions?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setConditions(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load conditions"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDelete(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }

  const active = conditions.filter((c) => c.status === "ACTIVE");
  const monitoring = conditions.filter((c) => c.status === "MONITORING");
  const resolved = conditions.filter((c) => c.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Conditions</h1>
        <Link
          href="/conditions/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Condition
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view conditions.</p>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          <Section
            title="Active"
            conditions={active}
            profileId={activeProfileId}
            onDelete={handleDelete}
            emptyText="No active conditions."
          />
          <Section
            title="Monitoring"
            conditions={monitoring}
            profileId={activeProfileId}
            onDelete={handleDelete}
            emptyText="No conditions being monitored."
          />
          {resolved.length > 0 && (
            <Section
              title="Resolved"
              conditions={resolved}
              profileId={activeProfileId}
              onDelete={handleDelete}
              emptyText=""
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  conditions,
  profileId,
  onDelete,
  emptyText,
}: {
  title: string;
  conditions: Condition[];
  profileId: string;
  onDelete: (id: string) => void;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-700">{title}</h2>
      {conditions.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {conditions.map((c) => (
            <ConditionCard
              key={c.id}
              condition={c}
              profileId={profileId}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
