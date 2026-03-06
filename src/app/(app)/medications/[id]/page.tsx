"use client";

import { useState, useEffect, use } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";

interface MedicationLog {
  id: string;
  date: string;
  dosage: number | null;
  unit: string | null;
  injectionSite: string | null;
  weight: number | null;
  notes: string | null;
}

interface Medication {
  id: string;
  name: string;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  instructions: string | null;
  prescribingDoctor?: { name: string } | null;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

export default function MedicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeProfileId } = useProfile();
  const [medication, setMedication] = useState<Medication | null>(null);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) return;

    Promise.all([
      fetch(`/api/medications/${id}?profileId=${activeProfileId}`).then((r) => r.json()),
      fetch(`/api/medications/${id}/logs?profileId=${activeProfileId}`).then((r) => r.json()),
    ])
      .then(([med, logData]) => {
        setMedication(med);
        setLogs(Array.isArray(logData) ? logData : []);
      })
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!medication) return <p className="text-sm text-red-600">Medication not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <a href="/medications" className="text-sm text-indigo-600 hover:underline">
          ← Back to Medications
        </a>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{medication.name}</h1>
          {medication.active ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              Inactive
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2 text-sm">
        {medication.prescribingDoctor && (
          <p>
            <span className="font-medium text-gray-600">Prescribed by:</span>{" "}
            {medication.prescribingDoctor.name}
          </p>
        )}
        <p>
          <span className="font-medium text-gray-600">Start date:</span>{" "}
          {fmt(medication.startDate)}
        </p>
        {medication.endDate && (
          <p>
            <span className="font-medium text-gray-600">End date:</span>{" "}
            {fmt(medication.endDate)}
          </p>
        )}
        {medication.instructions && (
          <p>
            <span className="font-medium text-gray-600">Instructions:</span>{" "}
            {medication.instructions}
          </p>
        )}
        <div className="pt-2 flex gap-2">
          <a
            href={`/medications/${id}/log`}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            Log dose
          </a>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Dose history</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No doses logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Dosage</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Weight (lbs)</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDateTime(log.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.dosage != null ? `${log.dosage} ${log.unit ?? ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">{log.injectionSite ?? "—"}</td>
                    <td className="px-4 py-3">{log.weight ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{log.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
