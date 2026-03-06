"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormData {
  name: string;
  birthYear: number;
  sex: string;
  state: string;
  notes: string;
}

interface Profile extends ProfileFormData {
  id: string;
}

const SEX_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export function ProfileForm({ profile }: { profile?: Profile }) {
  const router = useRouter();
  const isEdit = !!profile;

  const [form, setForm] = useState<ProfileFormData>({
    name: profile?.name ?? "",
    birthYear: profile?.birthYear ?? new Date().getFullYear() - 30,
    sex: profile?.sex ?? "PREFER_NOT_TO_SAY",
    state: profile?.state ?? "",
    notes: profile?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/profiles/${profile.id}` : "/api/profiles";
    const method = isEdit ? "PUT" : "POST";

    const body = {
      ...form,
      birthYear: Number(form.birthYear),
      state: form.state || undefined,
      notes: form.notes || undefined,
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

  return (
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
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="birthYear">
          Birth Year <span className="text-red-500">*</span>
        </label>
        <input
          id="birthYear"
          type="number"
          required
          min={1900}
          max={new Date().getFullYear()}
          value={form.birthYear}
          onChange={(e) => set("birthYear", Number(e.target.value))}
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
        <input
          id="state"
          type="text"
          value={form.state}
          onChange={(e) => set("state", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. CA"
          maxLength={2}
        />
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
  );
}
