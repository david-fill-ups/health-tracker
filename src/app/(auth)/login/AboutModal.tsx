"use client";

import { useState } from "react";

export function AboutModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full text-center text-xs text-indigo-500 hover:text-indigo-700 hover:underline focus:outline-none"
      >
        About this project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">About this project</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* What is this */}
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                What is this?
              </h3>
              <p className="text-sm leading-relaxed text-gray-700">
                A personal health management app for tracking medical records across multiple
                family profiles. Log doctor visits, medications with dosage history, vaccinations,
                and health conditions — all organized per person.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                Each account can hold multiple profiles (e.g., yourself, a spouse, a child).
                Profiles can be shared with other users at different permission levels —
                Owner, Write, or Read-Only — so the whole family stays on the same page.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                Every profile generates a private WebCal feed you can subscribe to in
                Google Calendar, Apple Calendar, or Outlook. Upcoming appointments and
                medication reminders show up automatically alongside the rest of your schedule.
              </p>
            </section>

            <hr className="my-4 border-gray-100" />

            {/* Tech stack */}
            <section className="mb-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Tech stack &amp; hosting
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: "Next.js",
                    desc: "The React framework powering the app — handles routing, server-side rendering, and API endpoints.",
                  },
                  {
                    name: "TypeScript",
                    desc: "Typed JavaScript. Catches bugs at compile time rather than at runtime.",
                  },
                  {
                    name: "Tailwind CSS",
                    desc: "Utility-first CSS framework used for all styling — no separate stylesheet files.",
                  },
                  {
                    name: "Prisma ORM",
                    desc: "Handles all database reads and writes. Lets you work with the database using TypeScript instead of raw SQL.",
                  },
                  {
                    name: "PostgreSQL",
                    desc: "The relational database storing all user data — profiles, visits, medications, vaccinations, etc.",
                  },
                  {
                    name: "NextAuth v5",
                    desc: "Authentication library managing the Google sign-in flow and user sessions.",
                  },
                  {
                    name: "Vercel",
                    desc: "Hosting platform where the app is deployed. Handles CI/CD — every push to main goes live automatically.",
                  },
                ].map(({ name, desc }) => (
                  <div key={name}>
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <hr className="my-4 border-gray-100" />

            {/* Access */}
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Want access?
              </h3>
              <p className="text-sm text-gray-700">
                Email{" "}
                <a
                  href="mailto:phillipsdavidpaul@gmail.com"
                  className="text-indigo-500 hover:underline"
                >
                  phillipsdavidpaul@gmail.com
                </a>{" "}
                to be added as a tester.
              </p>
              <p className="mt-3">
                <a
                  href="https://www.linkedin.com/in/davidpaulphillips/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-500 hover:underline"
                >
                  Connect on LinkedIn
                </a>
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
