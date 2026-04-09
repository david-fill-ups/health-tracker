"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "◎" },
  { label: "Profiles", href: "/profiles", icon: "👤" },
  { label: "Healthcare Team", href: "/healthcare-team", icon: "🏥" },
  { label: "Visits", href: "/visits", icon: "📅" },
  { label: "Medications", href: "/medications", icon: "💊" },
  { label: "Health Metrics", href: "/health-metrics", icon: "📊" },
  { label: "Conditions", href: "/conditions", icon: "📋" },
  { label: "Family History", href: "/family-history", icon: "🧬" },
  { label: "Allergies", href: "/allergies", icon: "🌿" },
  { label: "Vaccinations", href: "/vaccinations", icon: "💉" },
  { label: "Insurance", href: "/insurance", icon: "🪪" },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        aria-label="Open navigation"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
              <span className="text-lg font-bold text-indigo-600">Health Tracker</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close navigation"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-1 p-3">
              {NAV_ITEMS.map(({ label, href, icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}
