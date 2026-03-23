"use client";

import { useState, useEffect, use } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { formatDate, formatDateTime } from "@/lib/format";

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
  dosage: string | null;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  instructions: string | null;
  prescribingDoctor?: { name: string } | null;
}

interface LogEditForm {
  date: string;
  dosage: string;
  unit: string;
  injectionSite: string;
  weight: string;
  notes: string;
}

function toISOLocal(dateStr: string) {
  // Convert ISO string to datetime-local input value
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [deactivating, setDeactivating] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LogEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  async function handleDeactivate() {
    if (!activeProfileId || !confirm("Deactivate this medication?")) return;
    setDeactivating(true);
    const res = await fetch(`/api/medications/${id}?profileId=${activeProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (res.ok) {
      setMedication((prev) => prev ? { ...prev, active: false } : prev);
    }
    setDeactivating(false);
  }

  function startEdit(log: MedicationLog) {
    setEditingLogId(log.id);
    setEditError(null);
    setEditForm({
      date: toISOLocal(log.date),
      dosage: log.dosage != null ? String(log.dosage) : "",
      unit: log.unit ?? "",
      injectionSite: log.injectionSite ?? "",
      weight: log.weight != null ? String(log.weight) : "",
      notes: log.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingLogId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editForm || !editingLogId || !activeProfileId) return;
    setSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = {
        date: new Date(editForm.date).toISOString(),
      };
      if (editForm.dosage) body.dosage = parseFloat(editForm.dosage);
      if (editForm.unit) body.unit = editForm.unit;
      if (editForm.injectionSite) body.injectionSite = editForm.injectionSite;
      if (editForm.weight) body.weight = parseFloat(editForm.weight);
      if (editForm.notes) body.notes = editForm.notes;

      const res = await fetch(
        `/api/medications/${id}/logs/${editingLogId}?profileId=${activeProfileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      const updated: MedicationLog = await res.json();
      setLogs((prev) => prev.map((l) => (l.id === editingLogId ? updated : l)));
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(logId: string) {
    if (!activeProfileId || !confirm("Delete this dose entry?")) return;
    const res = await fetch(
      `/api/medications/${id}/logs/${logId}?profileId=${activeProfileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      if (editingLogId === logId) cancelEdit();
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">
            {medication.name}
            {medication.dosage && (
              <span className="ml-2 text-xl font-normal text-gray-500">{medication.dosage}</span>
            )}
          </h1>
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
          {formatDate(medication.startDate)}
        </p>
        {medication.endDate && (
          <p>
            <span className="font-medium text-gray-600">End date:</span>{" "}
            {formatDate(medication.endDate)}
          </p>
        )}
        {medication.instructions && (
          <p>
            <span className="font-medium text-gray-600">Instructions:</span>{" "}
            {medication.instructions}
          </p>
        )}
        <div className="pt-2 flex gap-2">
          {medication.active && (
            <a
              href={`/medications/${id}/log`}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Log dose
            </a>
          )}
          <a
            href={`/medications/${id}/edit`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </a>
          {medication.active && (
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deactivating ? "Deactivating…" : "Deactivate"}
            </button>
          )}
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
                {logs.map((log) =>
                  editingLogId === log.id && editForm ? (
                    <tr key={log.id} className="bg-indigo-50/40">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-3">
                          {editError && (
                            <p className="text-xs text-red-600">{editError}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Date & time</label>
                              <input
                                type="datetime-local"
                                value={editForm.date}
                                onChange={(e) => setEditForm((f) => f && { ...f, date: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                              <input
                                type="number"
                                step="any"
                                value={editForm.dosage}
                                onChange={(e) => setEditForm((f) => f && { ...f, dosage: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                              <input
                                type="text"
                                value={editForm.unit}
                                onChange={(e) => setEditForm((f) => f && { ...f, unit: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Injection site</label>
                              <input
                                type="text"
                                value={editForm.injectionSite}
                                onChange={(e) => setEditForm((f) => f && { ...f, injectionSite: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lbs)</label>
                              <input
                                type="number"
                                step="any"
                                value={editForm.weight}
                                onChange={(e) => setEditForm((f) => f && { ...f, weight: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                              <input
                                type="text"
                                value={editForm.notes}
                                onChange={(e) => setEditForm((f) => f && { ...f, notes: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteLog(log.id)}
                              className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => startEdit(log)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.dosage != null ? `${log.dosage} ${log.unit ?? ""}` : "—"}
                      </td>
                      <td className="px-4 py-3">{log.injectionSite ?? "—"}</td>
                      <td className="px-4 py-3">{log.weight ?? "—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{log.notes ?? "—"}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
