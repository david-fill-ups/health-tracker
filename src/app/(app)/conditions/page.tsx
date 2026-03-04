export const metadata = { title: "Conditions — Health Tracker" };

export default function ConditionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Conditions</h1>
        <a
          href="/conditions/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Condition
        </a>
      </div>
      {/* Condition list — implemented by Agent F */}
    </div>
  );
}
