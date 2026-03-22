"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "◎" },
  { label: "Profiles", href: "/profiles", icon: "👤" },
  { label: "Healthcare Team", href: "/healthcare-team", icon: "🏥" },
  { label: "Visits", href: "/visits", icon: "📅" },
  { label: "Medications", href: "/medications", icon: "💊" },
  { label: "Health Metrics", href: "/health-metrics", icon: "📊" },
  { label: "Conditions", href: "/conditions", icon: "📋" },
  { label: "Allergies", href: "/allergies", icon: "🌿" },
  { label: "Vaccinations", href: "/vaccinations", icon: "💉" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center px-4 border-b border-gray-200">
        <span className="text-lg font-bold text-indigo-600">Health Tracker</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
