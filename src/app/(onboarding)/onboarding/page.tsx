import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const metadata = { title: "Welcome — Health Tracker" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profileCount = await prisma.profileAccess.count({
    where: { userId: session.user.id },
  });
  if (profileCount > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Health Tracker</h1>
          <p className="mt-2 text-sm text-gray-500">
            Let&apos;s set up your profile. You can add more profiles later.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <OnboardingForm defaultName={session.user.name ?? ""} />
        </div>
      </div>
    </div>
  );
}
