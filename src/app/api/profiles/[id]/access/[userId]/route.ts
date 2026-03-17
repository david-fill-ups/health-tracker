import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { removeProfileAccess, updateProfileAccessPermission, cancelProfileInvitation } from "@/server/profile-access";
import { parseBody, UpdateProfileAccessSchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const { id, userId: targetUserId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const parsed = parseBody(UpdateProfileAccessSchema, body);
    if (!parsed.ok) return parsed.response;
    const updated = await updateProfileAccessPermission(session.user.id, id, targetUserId, parsed.data.permission);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Props) {
  const { id, userId: targetId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // targetId is either a userId (for revoking access) or an email (for cancelling an invite)
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "invitation") {
      // targetId is the email (URL-encoded)
      await cancelProfileInvitation(session.user.id, id, decodeURIComponent(targetId));
    } else {
      await removeProfileAccess(session.user.id, id, targetId);
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
