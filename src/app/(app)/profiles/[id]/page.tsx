import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getProfileById, regenerateCalendarToken } from "@/server/profiles";
import { hasProfileAccess } from "@/lib/permissions";
import { CopyButton } from "@/components/profiles/CopyButton";
import { SharingSection } from "@/components/profiles/SharingSection";
import { LinkedProfilesSection } from "@/components/profiles/LinkedProfilesSection";
import { ProfileActions } from "@/components/profiles/ProfileActions";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Profile — Health Tracker" };

export default async function ProfileDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, isOwner] = await Promise.all([
    getProfileById(session.user.id, id),
    hasProfileAccess(session.user.id, id, "OWNER"),
  ]);
  if (!profile) notFound();

  const host = process.env.NEXTAUTH_URL ?? "localhost:3000";
  const calUrl = profile.calendarToken
    ? `webcal://${host.replace(/^https?:\/\//, "")}/api/calendar/${id}?token=${profile.calendarToken}`
    : null;

  async function handleRegenerate() {
    "use server";
    const sess = await auth();
    if (!sess?.user?.id) redirect("/login");
    await regenerateCalendarToken(sess.user.id, id);
    redirect(`/profiles/${id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profiles" className="text-sm text-gray-500 hover:text-gray-800">
          ← Profiles
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
            <p className="mt-1 text-gray-800">{profile.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</p>
            <p className="mt-1 text-gray-800">{new Date(profile.birthDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sex</p>
            <p className="mt-1 capitalize text-gray-800">
              {profile.sex.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">State</p>
            <p className="mt-1 text-gray-800">{profile.state ?? "—"}</p>
          </div>
          {profile.notes && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</p>
              <p className="mt-1 text-gray-800 whitespace-pre-wrap">{profile.notes}</p>
            </div>
          )}
        </div>

        {calUrl && (
          <div className="border-t border-gray-100 pt-5">
            <p className="mb-2 text-sm font-medium text-gray-700">Calendar Subscription</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <code className="flex-1 truncate text-xs text-gray-600">{calUrl}</code>
              <CopyButton text={calUrl} />
            </div>
            <form action={handleRegenerate} className="mt-2">
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                Regenerate token
              </button>
            </form>
          </div>
        )}

        <LinkedProfilesSection profileId={id} profileName={profile.name} isOwner={isOwner} />

        <SharingSection profileId={id} currentUserId={session.user.id} isOwnerProfile={profile.isOwnerProfile} />

        <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-3">
          <Link
            href={`/profiles/${id}/edit`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Edit profile
          </Link>
          <a
            href={`/api/profiles/${id}/export`}
            download={`health-export-${profile.name.toLowerCase().replace(/\s+/g, "-")}.json`}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Export data
          </a>
          <Link
            href="/profiles"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Back
          </Link>
        </div>

        <ProfileActions profileId={id} profileName={profile.name} />
      </div>
    </div>
  );
}
