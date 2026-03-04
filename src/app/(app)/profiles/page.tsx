export const metadata = { title: "Profiles — Health Tracker" };

export default function ProfilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Profiles</h1>
        <a
          href="/profiles/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Profile
        </a>
      </div>
      <p className="text-sm text-gray-500">
        Manage health profiles for yourself and family members.
      </p>
      {/* Profile list — implemented by Agent D */}
    </div>
  );
}
