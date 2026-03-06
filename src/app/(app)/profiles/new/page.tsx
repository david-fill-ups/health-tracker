import Link from "next/link";
import { ProfileForm } from "@/components/profiles/ProfileForm";

export const metadata = { title: "New Profile — Health Tracker" };

export default function NewProfilePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profiles" className="text-sm text-gray-500 hover:text-gray-800">
          ← Profiles
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Profile</h1>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ProfileForm />
      </div>
    </div>
  );
}
