export const metadata = { title: "Visits — Health Tracker" };

export default function VisitsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visits & Appointments</h1>
        <a
          href="/visits/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Visit
        </a>
      </div>
      {/* Visit list — implemented by Agent E */}
    </div>
  );
}
