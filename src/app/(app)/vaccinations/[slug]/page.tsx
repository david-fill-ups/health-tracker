"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { getVaccineBySlug, getCdcLastUpdated, vaccineToSlug } from "@/lib/cdc";
import type { CdcVaccineSchedule, VaccinationRecommendation } from "@/lib/cdc";

type VaccinationSource = "ADMINISTERED" | "NATURAL" | "DECLINED";

const SOURCE_LABEL: Partial<Record<VaccinationSource, string>> = {
  NATURAL: "Natural immunity",
  DECLINED: "Declined",
};

interface VaccinationRecord {
  id: string;
  name: string;
  date: string;
  source?: VaccinationSource | null;
  lotNumber: string | null;
  facility?: { name: string } | null;
}

const FREQUENCY_LABEL: Record<string, string> = {
  annual: "Annually",
  booster: "Booster",
  series: "Series",
  once: "Once",
};

export default function VaccineInfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [recommendation, setRecommendation] = useState<VaccinationRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [renamingActive, setRenamingActive] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const vaccineInfo: CdcVaccineSchedule | null = getVaccineBySlug(slug);
  const cdcLastUpdated = getCdcLastUpdated();

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/vaccinations?profileId=${activeProfileId}`).then((r) => r.json()),
      fetch(`/api/vaccinations/recommendations?profileId=${activeProfileId}`).then((r) => r.json()),
    ])
      .then(([vaxData, recData]) => {
        if (Array.isArray(vaxData)) {
          if (vaccineInfo) {
            const allNames = [vaccineInfo.vaccine, ...vaccineInfo.aliases].map((n) => n.toLowerCase());
            setRecords(vaxData.filter((v: VaccinationRecord) => allNames.includes(v.name.toLowerCase())));
          } else {
            setRecords(vaxData.filter((v: VaccinationRecord) => vaccineToSlug(v.name) === slug));
          }
        }
        if (Array.isArray(recData?.recommendations)) {
          const allNames = vaccineInfo
            ? [vaccineInfo.vaccine, ...vaccineInfo.aliases].map((n) => n.toLowerCase())
            : [decodeURIComponent(slug).toLowerCase()];
          const match = recData.recommendations.find((r: VaccinationRecommendation) =>
            [r.vaccine, ...(r.aliases ?? [])].map((n) => n.toLowerCase()).some((n) => allNames.includes(n))
          );
          setRecommendation(match ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeProfileId, slug, vaccineInfo]);

  const displayName = vaccineInfo?.vaccine ?? records[0]?.name ?? decodeURIComponent(slug).replace(/-/g, " ");
  // Only allow renaming custom-named vaccines (no CDC entry) that have records
  const canRename = !vaccineInfo && records.length > 0;

  const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
    up_to_date: { label: "Up to date", classes: "bg-green-100 text-green-700" },
    due:        { label: "Due",         classes: "bg-amber-100 text-amber-700" },
    overdue:    { label: "Overdue",     classes: "bg-red-100 text-red-700" },
    completed:  { label: "Completed",   classes: "bg-blue-100 text-blue-700" },
    exempt:     { label: "Declined",    classes: "bg-gray-100 text-gray-500" },
  };
  function fmtMonth(d: Date | string | null): string | null {
    if (!d) return null;
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  }
  const statusBadge = (() => {
    if (!recommendation || recommendation.status === "not_applicable" || recommendation.status === "not_scheduled") return null;
    const base = STATUS_BADGE[recommendation.status];
    if (!base) return null;
    let subtitle: string | null = null;
    if (recommendation.status === "overdue" && recommendation.nextDueDate)
      subtitle = `Was due ${fmtMonth(recommendation.nextDueDate)}`;
    else if (recommendation.status === "due" && recommendation.nextDueDate)
      subtitle = `Due ${fmtMonth(recommendation.nextDueDate)}`;
    else if (recommendation.status === "up_to_date" && recommendation.nextDueDate)
      subtitle = `Next due ${fmtMonth(recommendation.nextDueDate)}`;
    else if (recommendation.status === "completed" && recommendation.lastDoseDate)
      subtitle = `Last dose ${fmtMonth(recommendation.lastDoseDate)}`;
    return { ...base, subtitle };
  })();

  async function handleRename(e: { preventDefault(): void }) {
    e.preventDefault();
    const newName = renameValue.trim();
    if (!newName || newName === displayName || !activeProfileId) {
      setRenamingActive(false);
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch("/api/vaccinations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileId, oldName: displayName, newName }),
      });
      if (res.ok) {
        router.replace(`/vaccinations/${vaccineToSlug(newName)}`);
      }
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/vaccinations" className="text-sm text-indigo-600 hover:underline">
          ← Back to Vaccinations
        </Link>
        {renamingActive ? (
          <form onSubmit={handleRename} className="mt-2 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="flex-1 rounded-lg border border-indigo-400 px-3 py-1.5 text-2xl font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={renaming}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {renaming ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setRenamingActive(false)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {canRename && (
              <button
                onClick={() => { setRenameValue(displayName); setRenamingActive(true); }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Rename
              </button>
            )}
          </div>
        )}
        {vaccineInfo?.aliases && vaccineInfo.aliases.length > 0 && (
          <p className="mt-1 text-sm text-gray-400">Also known as: {vaccineInfo.aliases.join(", ")}</p>
        )}
        {statusBadge && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.classes}`}>
              {statusBadge.label}
            </span>
            {statusBadge.subtitle && (
              <span className="text-sm text-gray-500">{statusBadge.subtitle}</span>
            )}
          </div>
        )}
      </div>

      {vaccineInfo?.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About this vaccine</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{vaccineInfo.description}</p>
        </div>
      )}

      {vaccineInfo && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">CDC Schedule</h2>
          <div className="space-y-3">
            {vaccineInfo.ageGroups.map((ag) => (
              <div key={ag.label} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-gray-900">{ag.label}</span>
                <span className="text-xs text-gray-500">
                  {FREQUENCY_LABEL[ag.frequency]}
                  {ag.doses ? ` · ${ag.doses} dose${ag.doses !== 1 ? "s" : ""}` : ""}
                  {ag.intervalMonths ? ` · every ${ag.intervalMonths} months` : ""}
                </span>
                <span className="text-xs text-gray-400">{ag.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!vaccineInfo && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">No CDC schedule information available for this vaccine.</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Records</h2>
          <Link
            href={`/vaccinations/new?name=${encodeURIComponent(vaccineInfo?.vaccine ?? displayName)}`}
            className="text-xs text-indigo-600 hover:underline"
          >
            + Record dose
          </Link>
        </div>

        {!activeProfileId && (
          <p className="text-sm text-gray-400">Select a profile to view your records.</p>
        )}

        {activeProfileId && loading && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        {activeProfileId && !loading && records.length === 0 && (
          <p className="text-sm text-gray-400">No doses recorded yet.</p>
        )}

        {activeProfileId && !loading && records.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {records
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((v) => (
                <li key={v.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-800">
                      {new Date(v.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {v.facility ? ` · ${v.facility.name}` : ""}
                    </p>
                    {v.lotNumber && (
                      <p className="text-xs text-gray-400">Lot: {v.lotNumber}</p>
                    )}
                    {v.source && SOURCE_LABEL[v.source] && (
                      <p className="text-xs italic text-gray-400">{SOURCE_LABEL[v.source]}</p>
                    )}
                  </div>
                  <Link
                    href={`/vaccinations/${vaccineToSlug(v.name)}/edit/${v.id}`}
                    className="text-xs text-gray-400 hover:text-indigo-600 shrink-0"
                  >
                    Edit
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>

      {vaccineInfo && (
        <p className="text-xs text-gray-400">
          Schedule information based on CDC immunization guidelines as of{" "}
          {new Date(cdcLastUpdated + "T00:00:00").toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}. For reference only — consult your doctor.
        </p>
      )}
    </div>
  );
}
