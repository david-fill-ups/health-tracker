"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VisitCard, type Visit } from "@/components/visits/VisitCard";
import type { VisitStatus } from "@/generated/prisma/enums";

const STATUS_TABS: Array<{ label: string; value: VisitStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function VisitsPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<VisitStatus | "ALL">("ALL");

  const fetchVisits = useCallback(async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/visits?profileId=${activeProfileId}`);
      if (res.ok) setVisits(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  async function handleDelete(id: string) {
    await fetch(`/api/visits/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    setVisits((prev) => prev.filter((v) => v.id !== id));
  }

  function handleEdit(visit: Visit) {
    router.push(`/visits/${visit.id}/edit`);
  }

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view visits.
      </div>
    );
  }

  const filtered =
    activeTab === "ALL" ? visits : visits.filter((v) => v.status === activeTab);

  // Visits with no date that are pending/scheduled — "needs scheduling" section
  const needsScheduling = filtered.filter(
    (v) => !v.date && (v.status === "PENDING" || v.status === "SCHEDULED")
  );
  const scheduled = filtered.filter((v) => !!v.date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visits & Appointments</h1>
        <a
          href="/visits/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Visit
        </a>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {/* Needs scheduling */}
          {needsScheduling.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                Needs Scheduling ({needsScheduling.length})
              </h2>
              <div className="space-y-3">
                {needsScheduling.map((v) => (
                  <VisitCard key={v.id} visit={v} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {/* Scheduled visits */}
          {scheduled.length > 0 && (
            <section className="space-y-3">
              {needsScheduling.length > 0 && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Scheduled
                </h2>
              )}
              <div className="space-y-3">
                {scheduled.map((v) => (
                  <VisitCard key={v.id} visit={v} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <p className="text-sm text-gray-400">No visits found.</p>
          )}
        </>
      )}
    </div>
  );
}
