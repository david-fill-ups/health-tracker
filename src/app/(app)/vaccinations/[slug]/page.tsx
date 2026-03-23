"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { getVaccineBySlug, getCdcLastUpdated, vaccineToSlug } from "@/lib/cdc";
import type { CdcVaccineSchedule } from "@/lib/cdc";

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
  const { activeProfileId } = useProfile();
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const vaccineInfo: CdcVaccineSchedule | null = getVaccineBySlug(slug);
  const cdcLastUpdated = getCdcLastUpdated();

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/vaccinations?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: VaccinationRecord[]) => {
        if (!Array.isArray(data)) return;
        // Match by canonical name and all aliases
        const allNames = vaccineInfo
          ? [vaccineInfo.vaccine, ...vaccineInfo.aliases].map((n) => n.toLowerCase())
          : [decodeURIComponent(slug).toLowerCase()];
        setRecords(data.filter((v) => allNames.includes(v.name.toLowerCase())));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeProfileId, slug, vaccineInfo]);

  const displayName = vaccineInfo?.vaccine ?? decodeURIComponent(slug).replace(/-/g, " ");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/vaccinations" className="text-sm text-indigo-600 hover:underline">
          ← Back to Vaccinations
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{displayName}</h1>
        {vaccineInfo?.aliases && vaccineInfo.aliases.length > 0 && (
          <p className="mt-1 text-sm text-gray-400">Also known as: {vaccineInfo.aliases.join(", ")}</p>
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
                      {new Date(v.date + "T00:00:00").toLocaleDateString(undefined, {
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
