"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GLOBAL_NAV_ITEMS, NAV_SECTIONS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  const navLink = (label: string, href: string, icon: string, size: "sm" | "base" = "sm") => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-${size} font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <span className="text-base">{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center px-4 border-b border-gray-200">
        <span className="text-lg font-bold text-indigo-600">Health Tracker</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {GLOBAL_NAV_ITEMS.map(({ label, href, icon }) => navLink(label, href, icon))}
        </div>

        <div className="my-3 border-t border-gray-100" />

        <div className="space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map(({ label, href, icon }) => navLink(label, href, icon))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
