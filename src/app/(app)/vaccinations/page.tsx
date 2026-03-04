export const metadata = { title: "Vaccinations — Health Tracker" };

export default function VaccinationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vaccinations</h1>
        <a
          href="/vaccinations/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Record Vaccination
        </a>
      </div>
      {/* Vaccination list + CDC compliance — implemented by Agent F */}
    </div>
  );
}
