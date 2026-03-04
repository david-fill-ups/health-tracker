import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard — Health Tracker" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Upcoming Visits"
          description="No upcoming appointments."
          href="/visits"
          accent="blue"
        />
        <DashboardCard
          title="Need to Schedule"
          description="No pending appointments."
          href="/visits"
          accent="amber"
        />
        <DashboardCard
          title="Upcoming Doses"
          description="No medications due soon."
          href="/medications"
          accent="green"
        />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Vaccination Status</h2>
        <p className="text-sm text-gray-500">
          Select a profile to view vaccination compliance against the CDC schedule.
        </p>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  accent: "blue" | "amber" | "green";
}) {
  const accentColors = {
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-green-200 bg-green-50",
  };
  return (
    <a
      href={href}
      className={`block rounded-xl border p-5 shadow-sm transition hover:shadow-md ${accentColors[accent]}`}
    >
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </a>
  );
}
