"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { MedicationForm } from "@/components/medications/MedicationForm";

export default function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<{
    name: string;
    medicationType: string | null;
    dosage: string | null;
    frequency: string | null;
    prescribingDoctorId: string | null;
    startDate: string | null;
    endDate: string | null;
    instructions: string | null;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/medications/${id}?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => {
        setInitialValues({
          name: data.name ?? "",
          medicationType: data.medicationType ?? "ORAL",
          dosage: data.dosage ?? null,
          frequency: data.frequency ?? null,
          prescribingDoctorId: data.prescribingDoctorId ?? null,
          startDate: data.startDate ? data.startDate.slice(0, 10) : null,
          endDate: data.endDate ? data.endDate.slice(0, 10) : null,
          instructions: data.instructions ?? null,
          active: data.active ?? true,
        });
      })
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  async function handleDelete() {
    if (!activeProfileId || !confirm("Permanently delete this medication and all its logs?")) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/medications/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/medications");
      router.refresh();
    } else {
      setDeleteError("Failed to delete medication");
      setDeleting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!initialValues) return <p className="text-sm text-red-600">Medication not found.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href={`/medications/${id}`} className="text-sm text-indigo-600 hover:underline">
          ← Back to Medication
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Medication</h1>
      </div>

      <MedicationForm
        profileId={activeProfileId}
        initialValues={initialValues}
        medicationId={id}
      />

      <div className="border-t border-gray-200 pt-4">
        {deleteError && <p className="mb-2 text-sm text-red-600">{deleteError}</p>}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete this medication permanently"
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete medication"}
        </button>
      </div>
    </div>
  );
}
