import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { DeleteAccountButton } from "@/components/account/DeleteAccountButton";
import Link from "next/link";

export const metadata = { title: "Account Settings — Health Tracker" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Profiles that WILL be deleted (owned by this user)
  const ownedProfiles = await prisma.profile.findMany({
    where: { userId },
    select: { id: true, name: true, isOwnerProfile: true },
    orderBy: { createdAt: "asc" },
  });

  // Profiles shared WITH this user (owned by someone else — access removed, not deleted)
  const sharedProfiles = await prisma.profile.findMany({
    where: {
      userId: { not: userId },
      access: { some: { userId } },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const user = session.user;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      {/* User info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Account
        </h2>
        <div className="flex items-center gap-4">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "User"}
              width={56}
              height={56}
              className="rounded-full"
            />
          )}
          <div>
            <p className="text-base font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs text-gray-400">Signed in with Google</p>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          API Reference
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Explore the REST API endpoints available in Health Tracker.
        </p>
        <Link
          href="/account/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Open API Reference
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>

      {/* Privacy */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Privacy
        </h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Your health data is stored securely and is never sold or shared with third parties.
            Each profile is accessible only to you and anyone you explicitly grant access to.
          </p>
          <p>
            When profiles are linked as family members, the names and relationships of those linked
            profiles become visible to everyone with access to the profile — even if the linked
            profiles have not been directly shared with them. Be mindful of this when sharing
            profiles that have family connections.
          </p>
          <p>
            When you use the document import feature, uploaded files are sent to an external
            AI provider to extract health information. Files are not retained by the AI provider
            beyond the duration of the analysis.
          </p>
          <p>
            You can permanently delete your account and all associated data using the
            Danger Zone below.
          </p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-red-500">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Permanently delete your account and all associated data.
        </p>

        <div className="rounded-lg bg-red-50 p-4 text-sm text-gray-700 space-y-3">
          <p className="font-medium text-gray-900">Deleting your account will permanently remove:</p>
          <ul className="ml-4 list-disc space-y-1 text-gray-600">
            <li>Your account and login credentials</li>
            {ownedProfiles.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.name}</span>
                {p.isOwnerProfile && (
                  <span className="ml-1 text-gray-400">(your profile)</span>
                )}
                {" — and all their health records (visits, medications, conditions, vaccinations)"}
              </li>
            ))}
          </ul>

          {sharedProfiles.length > 0 && (
            <div className="mt-3 border-t border-red-100 pt-3">
              <p className="font-medium text-gray-900">
                The following profiles will <span className="underline">not</span> be deleted
                because they belong to other accounts:
              </p>
              <ul className="ml-4 mt-1 list-disc space-y-1 text-gray-600">
                {sharedProfiles.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-1 text-gray-400">(shared with you)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
