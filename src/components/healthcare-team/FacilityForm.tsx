"use client";

import { useState } from "react";
import { FACILITY_TYPE_SUGGESTIONS } from "@/lib/validation";
import { NpiSearch } from "@/components/npi/NpiSearch";
import { NpiSyncModal } from "@/components/npi/NpiSyncModal";
import { taxonomyToFacilityType } from "@/lib/npi";
import type { NpiResult, NpiAddress } from "@/lib/npi";

interface FacilityFormData {
  name: string;
  type: string;
  npiNumber: string;
  rating: string;
  websiteUrl: string;
  portalUrl: string;
  phone: string;
  notes: string;
  active: boolean;
}

interface ExistingFacility {
  id: string;
  name: string;
  type: string;
  npiNumber?: string | null;
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
  initial?: ExistingFacility;
  onSuccess: (facility: ExistingFacility) => void;
  onCancel: () => void;
}

export function FacilityForm({ profileId, initial, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<"search" | "form">(initial ? "form" : "search");
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [npiLastSynced, setNpiLastSynced] = useState<Date | null>(
    initial?.npiLastSynced ? new Date(initial.npiLastSynced as string) : null
  );
  const [pendingAddress, setPendingAddress] = useState<NpiAddress | null>(null);
  const [createLocation, setCreateLocation] = useState(false);

  const [form, setForm] = useState<FacilityFormData>({
    name: initial?.name ?? "",
    type: initial?.type ?? "Clinic",
    npiNumber: initial?.npiNumber ?? "",
    rating: initial?.rating != null ? String(initial.rating) : "",
    websiteUrl: initial?.websiteUrl ?? "",
    portalUrl: initial?.portalUrl ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FacilityFormData>(key: K, value: FacilityFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNpiSelect(result: NpiResult) {
    if (result.type !== "organization") return;
    setForm((f) => ({
      ...f,
      name: result.name || f.name,
      type: result.specialty ? taxonomyToFacilityType(result.specialty) : f.type,
      phone: result.phone || f.phone,
      npiNumber: result.npiNumber,
    }));
    setNpiLastSynced(new Date());
    if (result.address) {
      setPendingAddress(result.address);
      setCreateLocation(true);
    }
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

    const ratingVal = form.rating ? parseFloat(form.rating) : undefined;

    const body = {
      name: form.name,
      type: form.type,
      npiNumber: form.npiNumber || undefined,
      npiLastSynced: npiLastSynced ?? undefined,
      rating: ratingVal != null && !isNaN(ratingVal) ? ratingVal : undefined,
      websiteUrl: form.websiteUrl || null,
      portalUrl: form.portalUrl || null,
      phone: form.phone || null,
      notes: form.notes || undefined,
      active: form.active,
    };

    try {
      let res: Response;
      if (initial) {
        res = await fetch(`/api/facilities/${initial.id}?profileId=${profileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/facilities?profileId=${profileId}`, {
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

      // Auto-create location from NPI address if requested (new facilities only)
      if (!initial && createLocation && pendingAddress && saved.id) {
        const locName = pendingAddress.city
          ? `${saved.name} – ${pendingAddress.city}`
          : saved.name;
        await fetch(`/api/locations?facilityId=${saved.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: locName,
            address1: pendingAddress.address1 || null,
            address2: pendingAddress.address2 || null,
            city: pendingAddress.city || null,
            state: pendingAddress.state || null,
            zip: pendingAddress.zip || null,
            phone: form.phone || null,
          }),
        });
      }

      onSuccess(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // ── Search step (new facilities only) ─────────────────────────────────────────
  if (step === "search") {
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">New Facility</h3>
        <NpiSearch
          type="organization"
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
          {initial ? "Edit Facility" : "New Facility"}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <input
              type="text"
              list="facility-type-suggestions"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="e.g. Clinic"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="facility-type-suggestions">
              {FACILITY_TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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

          {/* Address import checkbox (new facility with NPI address) */}
          {pendingAddress && !initial && (
            <div className="sm:col-span-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createLocation}
                  onChange={(e) => setCreateLocation(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  Also create a location:{" "}
                  <span className="text-gray-500">
                    {[pendingAddress.address1, pendingAddress.city, pendingAddress.state, pendingAddress.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="facility-active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="facility-active" className="text-sm text-gray-700">
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
            {saving ? "Saving…" : initial ? "Save Changes" : "Add Facility"}
          </button>
        </div>
      </form>

      {showSyncModal && form.npiNumber && (
        <NpiSyncModal
          npiNumber={form.npiNumber}
          entityType="organization"
          currentValues={{
            name: form.name,
            specialty: form.type,
            phone: form.phone,
          }}
          onApply={handleSyncApply}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </>
  );
}
