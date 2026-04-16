import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getProfileById } from "@/server/profiles";
import { hasProfileAccess } from "@/lib/permissions";
import { SharingSection } from "@/components/profiles/SharingSection";
import { LinkedProfilesSection } from "@/components/profiles/LinkedProfilesSection";
import { ProfileActions } from "@/components/profiles/ProfileActions";
import { ExpandableImage } from "@/components/ui/ExpandableImage";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Profile — Health Tracker" };

export default async function ProfileDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, isOwner, canWrite] = await Promise.all([
    getProfileById(session.user.id, id),
    hasProfileAccess(session.user.id, id, "OWNER"),
    hasProfileAccess(session.user.id, id, "WRITE"),
  ]);
  if (!profile) notFound();

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
        {profile.imageData && (
          <div className="flex justify-center">
            <ExpandableImage
              src={profile.imageData}
              alt={profile.name}
              className="h-36 w-36 rounded-full object-cover border-4 border-indigo-100 shadow-md"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
            <p className="mt-1 text-gray-800">{profile.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</p>
            <p className="mt-1 text-gray-800">{new Date(profile.birthDate).toLocaleDateString(undefined, { timeZone: "UTC" })}</p>
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

        <LinkedProfilesSection profileId={id} profileName={profile.name} isOwner={canWrite} />

        <SharingSection profileId={id} currentUserId={session.user.id} isOwnerProfile={profile.isOwnerProfile} />

        <ProfileActions profileId={id} profileName={profile.name} isOwner={isOwner} />
      </div>
    </div>
  );
}
