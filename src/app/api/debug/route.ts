import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  // 1. What cookies are present?
  const jar = await cookies();
  const cookieNames = jar.getAll().map((c) => c.name);

  // 2. What does auth() return?
  let sessionInfo: object = { error: "auth() threw" };
  try {
    const session = await auth();
    sessionInfo = session
      ? {
          hasSession: true,
          hasUserId: !!session.user?.id,
          userIdPrefix: session.user?.id?.slice(0, 8) ?? null,
          userName: session.user?.name ?? null,
        }
      : { hasSession: false };
  } catch (e) {
    sessionInfo = { error: String(e) };
  }

  // 3. Can Prisma reach the DB?
  let dbInfo: object = { error: "prisma threw" };
  try {
    const count = await prisma.user.count();
    dbInfo = { ok: true, userCount: count };
  } catch (e) {
    dbInfo = { ok: false, error: String(e) };
  }

  const result = { cookieNames, session: sessionInfo, db: dbInfo };
  console.log("[debug]", JSON.stringify(result));
  return NextResponse.json(result);
}
