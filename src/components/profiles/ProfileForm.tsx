"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportMode = "append" | "skip_duplicates" | "replace";

interface ProfileFormData {
  name: string;
  birthDate: string;
  sex: string;
  state: string;
  heightFt: string;
  heightInPart: string;
  notes: string;
  timezone: string;
}

interface Profile {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  state: string;
  heightIn?: number | null;
  notes: string;
  timezone?: string;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Phoenix", label: "Mountain Time — Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / Berlin / Rome" },
  { value: "Europe/Helsinki", label: "Helsinki / Athens" },
  { value: "Asia/Dubai", label: "Dubai / Abu Dhabi" },
  { value: "Asia/Kolkata", label: "Mumbai / Kolkata" },
  { value: "Asia/Bangkok", label: "Bangkok / Hanoi" },
  { value: "Asia/Shanghai", label: "Beijing / Shanghai" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney / Melbourne" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

const SEX_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export function ProfileForm({ profile }: { profile?: Profile }) {
  const router = useRouter();
  const isEdit = !!profile;
  const importRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileFormData>({
    name: profile?.name ?? "",
    birthDate: profile?.birthDate ?? `${new Date().getFullYear() - 30}-01-01`,
    sex: profile?.sex ?? "PREFER_NOT_TO_SAY",
    state: profile?.state ?? "",
    heightFt: profile?.heightIn ? Math.floor(profile.heightIn / 12).toString() : "",
    heightInPart: profile?.heightIn ? (profile.heightIn % 12).toString() : "",
    notes: profile?.notes ?? "",
    timezone: profile?.timezone ?? "UTC",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ data: unknown; filename: string } | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("skip_duplicates");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  function set<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/profiles/${profile.id}` : "/api/profiles";
    const method = isEdit ? "PUT" : "POST";

    const totalInches = (form.heightFt || form.heightInPart)
      ? (parseInt(form.heightFt || "0") * 12) + parseInt(form.heightInPart || "0")
      : undefined;

    const body = {
      name: form.name,
      birthDate: form.birthDate,
      sex: form.sex,
      state: form.state || undefined,
      heightIn: totalInches || undefined,
      notes: form.notes || undefined,
      timezone: form.timezone || undefined,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/profiles");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete profile "${profile!.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/profiles/${profile!.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Failed to delete profile.");
      return;
    }
    router.push("/profiles");
    router.refresh();
  }

  async function handleExport() {
    const res = await fetch(`/api/profiles/${profile!.id}/export`);
    if (!res.ok) {
      setError("Export failed. Please try again.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.name.replace(/\s+/g, "-").toLowerCase()}-health-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setPendingImport({ data, filename: file.name });
        setImportResult(null);
        setError(null);
      } catch {
        setError("Could not parse the imported file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setImporting(true);
    setError(null);
    setImportResult(null);

    const res = await fetch(`/api/profiles/${profile!.id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: importMode, data: pendingImport.data }),
    });

    setImporting(false);
    setPendingImport(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Import failed. Please try again.");
      return;
    }

    const { imported } = await res.json();
    const parts = (Object.entries(imported) as [string, number][])
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`);
    setImportResult(
      parts.length > 0 ? `Imported: ${parts.join(", ")}.` : "Nothing new to import."
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isEdit && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {pendingImport && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
              <p className="text-xs font-medium text-blue-800">
                Ready to import <span className="font-semibold">{pendingImport.filename}</span>
              </p>
              <div className="space-y-1">
                <p className="text-xs text-blue-700 font-medium">Import mode:</p>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { value: "skip_duplicates", label: "Skip duplicates", desc: "Add new records; skip ones that already exist" },
                      { value: "append", label: "Append all", desc: "Add everything unconditionally (may create duplicates)" },
                      { value: "replace", label: "Replace all", desc: "Delete all existing records first, then import" },
                    ] as { value: ImportMode; label: string; desc: string }[]
                  ).map((opt) => (
                    <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value={opt.value}
                        checked={importMode === opt.value}
                        onChange={() => setImportMode(opt.value)}
                        className="mt-0.5"
                      />
                      <span className="text-xs text-blue-800">
                        <span className="font-medium">{opt.label}</span>
                        {" — "}
                        <span className="text-blue-600">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {importing ? "Importing…" : "Confirm import"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              {importResult}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="birthDate">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            id="birthDate"
            type="date"
            required
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            value={form.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sex">
            Sex <span className="text-red-500">*</span>
          </label>
          <select
            id="sex"
            required
            value={form.sex}
            onChange={(e) => set("sex", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="state">
            State
          </label>
          <select
            id="state"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Select state —</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({s.value})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="timezone">
            Timezone
          </label>
          <select
            id="timezone"
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Height</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="9"
              value={form.heightFt}
              onChange={(e) => set("heightFt", e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="5"
            />
            <span className="text-sm text-gray-500">ft</span>
            <input
              type="number"
              min="0"
              max="11"
              value={form.heightInPart}
              onChange={(e) => set("heightInPart", e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="10"
            />
            <span className="text-sm text-gray-500">in</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Any additional notes…"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create profile"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/profiles")}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="border-t border-gray-200 pt-5">
          <h3 className="mb-1 text-sm font-medium text-gray-700">Danger zone</h3>
          <p className="mb-3 text-xs text-gray-500">
            Permanently delete this profile and all associated data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete profile"}
          </button>
        </div>
      )}
    </div>
  );
}
