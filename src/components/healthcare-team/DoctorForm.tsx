"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { NpiSearch } from "@/components/npi/NpiSearch";
import { NpiSyncModal } from "@/components/npi/NpiSyncModal";
import type { NpiResult } from "@/lib/npi";

interface Facility {
  id: string;
  name: string;
  websiteUrl?: string | null;
  portalUrl?: string | null;
}

interface Location {
  id: string;
  name: string;
  facilityId: string;
}

interface DoctorFormData {
  name: string;
  specialty: string;
  facilityId: string;
  primaryLocationId: string;
  npiNumber: string;
  credential: string;
  photo: string;
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
  primaryLocationId?: string | null;
  npiNumber?: string | null;
  credential?: string | null;
  photo?: string | null;
  npiLastSynced?: Date | string | null;
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
  locations?: Location[];
  existingSpecialties?: string[];
  initial?: ExistingDoctor;
  onSuccess: (doctor: ExistingDoctor & { facility?: Facility | null }) => void;
  onCancel: () => void;
}

export function DoctorForm({ profileId, facilities, locations = [], existingSpecialties = [], initial, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<"search" | "form">(initial ? "form" : "search");
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [npiLastSynced, setNpiLastSynced] = useState<Date | null>(
    initial?.npiLastSynced ? new Date(initial.npiLastSynced as string) : null
  );

  const [form, setForm] = useState<DoctorFormData>({
    name: initial?.name ?? "",
    specialty: initial?.specialty ?? "",
    facilityId: initial?.facilityId ?? "",
    primaryLocationId: initial?.primaryLocationId ?? "",
    npiNumber: initial?.npiNumber ?? "",
    credential: initial?.credential ?? "",
    photo: initial?.photo ?? "",
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

  function handleFacilityChange(facilityId: string) {
    const facility = facilities.find((f) => f.id === facilityId);
    setForm((f) => {
      const stillValid = locations.some(
        (l) => l.id === f.primaryLocationId && l.facilityId === facilityId
      );
      return {
        ...f,
        facilityId,
        primaryLocationId: stillValid ? f.primaryLocationId : "",
        websiteUrl: f.websiteUrl || facility?.websiteUrl || "",
        portalUrl: f.portalUrl || facility?.portalUrl || "",
      };
    });
  }

  const facilityLocations = locations.filter((l) => l.facilityId === form.facilityId);

  function handleNpiSelect(result: NpiResult) {
    if (result.type !== "individual") return;
    setForm((f) => ({
      ...f,
      name: result.name || f.name,
      specialty: result.specialty || f.specialty,
      phone: result.phone || f.phone,
      npiNumber: result.npiNumber,
      credential: result.credential || f.credential,
    }));
    setNpiLastSynced(new Date());
    setStep("form");
  }

  function handleSyncApply(accepted: Record<string, string>, syncedAt: Date) {
    setForm((f) => ({ ...f, ...accepted }));
    setNpiLastSynced(syncedAt);
    setShowSyncModal(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      specialty: form.specialty || undefined,
      facilityId: form.facilityId || undefined,
      primaryLocationId: form.primaryLocationId || undefined,
      npiNumber: form.npiNumber || undefined,
      credential: form.credential || undefined,
      photo: form.photo || undefined,
      npiLastSynced: npiLastSynced ?? undefined,
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

  // ── Search step (new doctors only) ────────────────────────────────────────────
  if (step === "search") {
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">New Doctor</h3>
        <NpiSearch
          type="individual"
          onSelect={handleNpiSelect}
          onDismiss={() => setStep("form")}
        />
      </div>
    );
  }

  // ── Form step ────────────────────────────────────────────────────────────────
  return (
    <>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Credential</label>
            <input
              type="text"
              value={form.credential}
              onChange={(e) => set("credential", e.target.value)}
              placeholder="MD, DO, NP, PA-C…"
              maxLength={50}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
            <select
              value={form.facilityId}
              onChange={(e) => handleFacilityChange(e.target.value)}
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

          {facilityLocations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Location</label>
              <select
                value={form.primaryLocationId}
                onChange={(e) => set("primaryLocationId", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— None —</option>
                {facilityLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

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

          {/* Photo upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
            <div className="flex gap-4 items-center">
              <button
                type="button"
                onClick={() => document.getElementById("photo-upload")?.click()}
                className="relative shrink-0 h-16 w-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 group"
              >
                {form.photo ? (
                  <img
                    src={form.photo}
                    alt={form.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm select-none">
                    {form.name
                      ? form.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                      : "?"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  className="text-sm text-indigo-600 hover:underline text-left"
                >
                  {form.photo ? "Change photo" : "Upload photo"}
                </button>
                {form.photo && (
                  <button
                    type="button"
                    onClick={() => set("photo", "")}
                    className="text-sm text-gray-400 hover:text-red-500 text-left"
                  >
                    Remove
                  </button>
                )}
                <span className="text-xs text-gray-400">JPG, PNG, GIF up to 2 MB</span>
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setError("Photo must be under 2 MB");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => set("photo", ev.target?.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* NPI Number + sync */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NPI Number</label>
            <input
              type="text"
              value={form.npiNumber}
              onChange={(e) => set("npiNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit NPI"
              maxLength={10}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {form.npiNumber && initial && (
              <div className="flex items-center gap-2 mt-1">
                {npiLastSynced && (
                  <span className="text-xs text-gray-400">
                    Synced {npiLastSynced.toLocaleDateString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Re-sync
                </button>
              </div>
            )}
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

      {showSyncModal && form.npiNumber && (
        <NpiSyncModal
          npiNumber={form.npiNumber}
          entityType="individual"
          currentValues={{
            name: form.name,
            specialty: form.specialty,
            phone: form.phone,
            credential: form.credential,
          }}
          onApply={handleSyncApply}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </>
  );
}
