"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui/StarRating";

interface Facility {
  id: string;
  name: string;
}

interface DoctorFormData {
  name: string;
  specialty: string;
  facilityId: string;
  rating: number | null;
  websiteUrl: string;
  portalUrl: string;
  phone: string;
  notes: string;
  active: boolean;
}

interface ExistingDoctor {
  id: string;
  name: string;
  specialty: string;
  facilityId: string;
  rating?: number | null;
  websiteUrl: string;
  portalUrl: string;
  phone: string;
  notes: string;
  active: boolean;
}

interface Props {
  profileId: string;
  facilities: Facility[];
  existingSpecialties?: string[];
  initial?: ExistingDoctor;
  onSuccess: (doctor: ExistingDoctor & { facility?: Facility | null }) => void;
  onCancel: () => void;
}

export function DoctorForm({ profileId, facilities, existingSpecialties = [], initial, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<DoctorFormData>({
    name: initial?.name ?? "",
    specialty: initial?.specialty ?? "",
    facilityId: initial?.facilityId ?? "",
    rating: initial?.rating ?? null,
    websiteUrl: initial?.websiteUrl ?? "",
    portalUrl: initial?.portalUrl ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof DoctorFormData>(key: K, value: DoctorFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      specialty: form.specialty || undefined,
      facilityId: form.facilityId || undefined,
      rating: form.rating ?? undefined,
      websiteUrl: form.websiteUrl || undefined,
      portalUrl: form.portalUrl || undefined,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
      active: form.active,
    };

    try {
      let res: Response;
      if (initial) {
        res = await fetch(`/api/doctors/${initial.id}?profileId=${profileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/doctors?profileId=${profileId}`, {
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4"
    >
      <h3 className="font-semibold text-gray-900">
        {initial ? "Edit Doctor" : "New Doctor"}
      </h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
          <input
            type="text"
            list="specialty-suggestions"
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            placeholder="e.g. Cardiologist"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <datalist id="specialty-suggestions">
            {existingSpecialties.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={(e) => set("websiteUrl", e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Portal URL</label>
          <input
            type="url"
            value={form.portalUrl}
            onChange={(e) => set("portalUrl", e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
          <StarRating value={form.rating} onChange={(r) => set("rating", r === 0 ? null : r)} />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="doctor-active"
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="doctor-active" className="text-sm text-gray-700">
            Active
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Doctor"}
        </button>
      </div>
    </form>
  );
}
