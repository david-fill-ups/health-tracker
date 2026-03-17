"use client";

import { useState, useEffect } from "react";
import type { VisitType, VisitStatus } from "@/generated/prisma/enums";

const VISIT_TYPES: VisitType[] = [
  "ROUTINE",
  "LAB",
  "SPECIALIST",
  "URGENT",
  "TELEHEALTH",
  "PROCEDURE",
  "OTHER",
];

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine",
  LAB: "Lab",
  SPECIALIST: "Specialist",
  URGENT: "Urgent",
  TELEHEALTH: "Telehealth",
  PROCEDURE: "Procedure",
  OTHER: "Other",
};

const VISIT_STATUSES: VisitStatus[] = ["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"];

const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface Facility {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface VisitFormData {
  date: string;
  dueMonth: string;
  type: VisitType;
  status: VisitStatus;
  doctorId: string;
  facilityId: string;
  locationId: string;
  notes: string;
}

export interface VisitInitial extends Partial<VisitFormData> {
  id: string;
}

interface Props {
  profileId: string;
  initial?: VisitInitial;
  onSuccess: (visit: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function VisitForm({ profileId, initial, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<VisitFormData>({
    date: initial?.date ?? "",
    dueMonth: initial?.dueMonth ?? "",
    type: initial?.type ?? "ROUTINE",
    status: initial?.status ?? "PENDING",
    doctorId: initial?.doctorId ?? "",
    facilityId: initial?.facilityId ?? "",
    locationId: initial?.locationId ?? "",
    notes: initial?.notes ?? "",
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load doctors and facilities
  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/doctors?profileId=${profileId}`)
      .then((r) => r.json())
      .then(setDoctors)
      .catch(() => {});
    fetch(`/api/facilities?profileId=${profileId}`)
      .then((r) => r.json())
      .then(setFacilities)
      .catch(() => {});
  }, [profileId]);

  // Load locations when facility changes
  useEffect(() => {
    if (!form.facilityId) {
      setLocations([]);
      setForm((f) => ({ ...f, locationId: "" }));
      return;
    }
    fetch(`/api/locations?facilityId=${form.facilityId}`)
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => {});
  }, [form.facilityId]);

  function set<K extends keyof VisitFormData>(key: K, value: VisitFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      profileId,
      type: form.type,
      status: form.status,
      doctorId: form.doctorId || undefined,
      facilityId: form.facilityId || undefined,
      locationId: form.locationId || undefined,
      notes: form.notes || undefined,
    };

    if (form.date) {
      body.date = form.date;
    } else if (form.dueMonth) {
      body.dueMonth = form.dueMonth;
    }

    try {
      let res: Response;
      if (initial) {
        res = await fetch(`/api/visits/${initial.id}?profileId=${profileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/visits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      const saved = await res.json();
      onSuccess(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => {
              const newStatus = e.target.value as VisitStatus;
              setForm((f) => ({
                ...f,
                status: newStatus,
                date: newStatus === "PENDING" ? "" : f.date,
                dueMonth: newStatus !== "PENDING" ? "" : f.dueMonth,
              }));
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VISIT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Date or Due Month based on status */}
        {form.status === "PENDING" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Month</label>
            <input
              type="month"
              value={form.dueMonth}
              onChange={(e) => set("dueMonth", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Date
            </label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value as VisitType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {VISIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {VISIT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
          <select
            value={form.doctorId}
            onChange={(e) => set("doctorId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— None —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.specialty ? ` (${d.specialty})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Facility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
          <select
            value={form.facilityId}
            onChange={(e) => set("facilityId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— None —</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location — dynamic based on facility */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={form.locationId}
            onChange={(e) => set("locationId", e.target.value)}
            disabled={!form.facilityId || locations.length === 0}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">— None —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Visit"}
        </button>
      </div>
    </form>
  );
}
