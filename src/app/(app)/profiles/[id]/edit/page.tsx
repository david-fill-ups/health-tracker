import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getProfileById } from "@/server/profiles";
import { ProfileForm } from "@/components/profiles/ProfileForm";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Profile — Health Tracker" };

export default async function EditProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getProfileById(session.user.id, id);
  if (!profile) notFound();

  // ProfileForm expects string sex + optional string fields
  const formProfile = {
    id: profile.id,
    name: profile.name,
    birthDate: profile.birthDate.toISOString().slice(0, 10),
    sex: profile.sex as string,
    state: profile.state ?? "",
    notes: profile.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profiles" className="text-sm text-gray-500 hover:text-gray-800">
          ← Profiles
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`/profiles/${id}`} className="text-sm text-gray-500 hover:text-gray-800">
          {profile.name}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Edit</h1>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ProfileForm profile={formProfile} />
      </div>
    </div>
  );
}
