import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  // --- Cookies ---
  const jar = await cookies();
  const allCookies = jar.getAll().map((c) => ({ name: c.name, value: c.value }));

  // --- Session ---
  let session: object = { error: "auth() threw" };
  try {
    const s = await auth();
    session = s ? JSON.parse(JSON.stringify(s)) : { hasSession: false };
  } catch (e) {
    session = { error: String(e) };
  }

  // --- Headers ---
  const headerStore = await headers();
  const relevantHeaders: Record<string, string> = {};
  for (const name of [
    "host",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-for",
    "x-real-ip",
    "cookie",
    "referer",
  ]) {
    const val = headerStore.get(name);
    if (val) relevantHeaders[name] = name === "cookie" ? "[redacted — see cookies above]" : val;
  }

  // --- Env hints ---
  const envHints = {
    NODE_ENV: process.env.NODE_ENV ?? "(not set)",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
    AUTH_URL: process.env.AUTH_URL ?? "(not set)",
    AUTH_SECRET_prefix: process.env.AUTH_SECRET
      ? process.env.AUTH_SECRET.slice(0, 8) + "..."
      : "(not set)",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "(not set)",
    VERCEL: process.env.VERCEL ?? "(not set)",
    VERCEL_URL: process.env.VERCEL_URL ?? "(not set)",
  };

  // --- DB ---
  let db: object = { error: "prisma threw" };
  try {
    const userCount = await prisma.user.count();
    const accounts = await prisma.account.findMany({ select: { userId: true, provider: true } });
    const sessions = await prisma.session.findMany({ select: { userId: true, expires: true } });
    db = { ok: true, userCount, accounts, sessionRows: sessions };
  } catch (e) {
    db = { ok: false, error: String(e) };
  }

  const data = { cookies: allCookies, session, headers: relevantHeaders, env: envHints, db };

  return (
    <div className="min-h-screen bg-gray-950 p-8 font-mono text-sm text-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">🔍 Debug — Post-Login State</h1>

      <Section title="Cookies">
        {allCookies.length === 0 ? (
          <p className="text-red-400">No cookies found</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-1 pr-8">Name</th>
                <th className="pb-1">Value (first 80 chars)</th>
              </tr>
            </thead>
            <tbody>
              {allCookies.map((c) => (
                <tr key={c.name} className="border-t border-gray-800">
                  <td className="py-1 pr-8 text-cyan-300">{c.name}</td>
                  <td className="py-1 break-all text-gray-300">
                    {c.value.length > 80 ? c.value.slice(0, 80) + "…" : c.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Session (from auth())">
        <pre className="whitespace-pre-wrap break-all text-green-300">
          {JSON.stringify(session, null, 2)}
        </pre>
      </Section>

      <Section title="Relevant Request Headers">
        <pre className="whitespace-pre-wrap break-all text-blue-300">
          {JSON.stringify(relevantHeaders, null, 2)}
        </pre>
      </Section>

      <Section title="Env Hints">
        <pre className="whitespace-pre-wrap break-all text-purple-300">
          {JSON.stringify(envHints, null, 2)}
        </pre>
      </Section>

      <Section title="Database">
        <pre className="whitespace-pre-wrap break-all text-orange-300">
          {JSON.stringify(db, null, 2)}
        </pre>
      </Section>

      <div className="mt-8 flex gap-4">
        <a
          href="/dashboard"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
        >
          → Go to Dashboard
        </a>
        <a
          href="/api/debug"
          className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
        >
          → /api/debug (JSON)
        </a>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-2 border-b border-gray-700 pb-1 text-lg font-semibold text-yellow-300">
        {title}
      </h2>
      {children}
    </div>
  );
}
