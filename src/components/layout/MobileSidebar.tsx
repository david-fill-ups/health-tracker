"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { GLOBAL_NAV_ITEMS, NAV_SECTIONS } from "./nav-items";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLink = (label: string, href: string, icon: string) => {
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
  };

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
        </>
      )}
    </div>
  );
}
