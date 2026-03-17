import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ApiDocsViewer from "@/components/account/ApiDocsViewer";

export const metadata = { title: "API Reference — Health Tracker" };

export default async function ApiDocsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">API Reference</h1>
      <ApiDocsViewer />
    </div>
  );
}
