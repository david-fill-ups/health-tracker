"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import type { ConditionStatus } from "@/generated/prisma/enums";
import { CardSkeleton } from "@/components/ui/Skeleton";

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
  BENIGN: { label: "Incidental / Benign", classes: "bg-slate-100 text-slate-600" },
};

function ConditionCard({ condition }: { condition: Condition }) {
  const badge = STATUS_BADGE[condition.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/conditions/${condition.id}/edit`}
          className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
        >
          {condition.name}
        </Link>
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

  const active = conditions.filter((c) => c.status === "ACTIVE");
  const monitoring = conditions.filter((c) => c.status === "MONITORING");
  const resolved = conditions.filter((c) => c.status === "RESOLVED");
  const benign = conditions.filter((c) => c.status === "BENIGN");

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

      {loading && <CardSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && conditions.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 mb-3">No conditions recorded.</p>
          <Link
            href="/conditions/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add your first condition
          </Link>
        </div>
      )}

      {activeProfileId && !loading && conditions.length > 0 && (
        <>
          <Section title="Active" conditions={active} emptyText="No active conditions." />
          <Section title="Monitoring" conditions={monitoring} emptyText="No conditions being monitored." />
          {resolved.length > 0 && <Section title="Resolved" conditions={resolved} emptyText="" />}
          {benign.length > 0 && <Section title="Incidental / Benign" conditions={benign} emptyText="" />}
        </>
      )}
    </div>
  );
}

function Section({ title, conditions, emptyText }: { title: string; conditions: Condition[]; emptyText: string }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-700">{title}</h2>
      {conditions.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {conditions.map((c) => (
            <ConditionCard key={c.id} condition={c} />
          ))}
        </div>
      )}
    </section>
  );
}
