"use client";

import { useRouter } from "next/navigation";

interface Vaccination {
  id: string;
  name: string;
  date: string;
  lotNumber: string | null;
  facility?: { name: string } | null;
}

interface VaccinationCardProps {
  vaccination: Vaccination;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function VaccinationCard({ vaccination, onDelete, compact }: VaccinationCardProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete vaccination record for ${vaccination.name}?`)) return;
    await fetch(`/api/vaccinations/${vaccination.id}`, { method: "DELETE" });
    onDelete(vaccination.id);
    router.refresh();
  }

  if (compact) {
    return (
      <button
        onClick={handleDelete}
        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{vaccination.name}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date(vaccination.date).toLocaleDateString()}
          {vaccination.facility ? ` · ${vaccination.facility.name}` : ""}
        </p>
        {vaccination.lotNumber && (
          <p className="mt-0.5 text-xs text-gray-400">Lot: {vaccination.lotNumber}</p>
        )}
      </div>
      <button
        onClick={handleDelete}
        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
