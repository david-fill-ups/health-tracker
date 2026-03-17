import { signOut } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { ProfileSwitcher } from "./ProfileSwitcher";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function TopNav({ user }: { user: User }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2">
        <ProfileSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <Link href="/account" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
