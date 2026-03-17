"use client";

interface MedicationLog {
  id: string;
  date: string;
  dosage: number;
  unit: string;
  injectionSite: string | null;
  weight: number | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  prescribingDoctorId: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  recentLog?: MedicationLog | null;
  prescribingDoctor?: { name: string } | null;
}

interface MedicationCardProps {
  medication: Medication;
  profileId: string;
  onDeactivate: (id: string) => void;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString();
}

export function MedicationCard({ medication, profileId, onDeactivate }: MedicationCardProps) {
  const log = medication.recentLog;

  async function handleDeactivate() {
    await fetch(`/api/medications/${medication.id}?profileId=${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    onDeactivate(medication.id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-lg">
              {medication.name}
              {medication.dosage && (
                <span className="ml-1.5 text-base font-normal text-gray-500">{medication.dosage}</span>
              )}
            </h3>
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

          {medication.prescribingDoctor && (
            <p className="mt-1 text-sm text-gray-500">
              Prescribed by {medication.prescribingDoctor.name}
            </p>
          )}

          <div className="mt-1 flex gap-4 text-xs text-gray-400">
            {medication.startDate && <span>Started {fmt(medication.startDate)}</span>}
            {medication.endDate && <span>Ended {fmt(medication.endDate)}</span>}
          </div>

          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
            {log ? (
              <div className="space-y-0.5">
                <p className="font-medium text-gray-700">Last dose: {fmt(log.date)}</p>
                <p className="text-gray-500">
                  {log.dosage} {log.unit}
                  {log.injectionSite ? ` · ${log.injectionSite}` : ""}
                  {log.weight ? ` · ${log.weight} lbs` : ""}
                </p>
              </div>
            ) : (
              <p className="text-gray-400 italic">No doses logged yet</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {medication.active && (
            <a
              href={`/medications/${medication.id}/log`}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 text-center whitespace-nowrap"
            >
              Log dose
            </a>
          )}
          <a
            href={`/medications/${medication.id}`}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 text-center"
          >
            View
          </a>
          {medication.active && (
            <button
              onClick={handleDeactivate}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
