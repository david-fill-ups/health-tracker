import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCalendarFeed } from "@/lib/calendar";

/**
 * WebCal iCal feed for a profile's appointments.
 * Protected by a per-profile secret token (no session required).
 *
 * Subscribe URL: webcal://yourdomain.com/api/calendar/[profileId]?token=xxx
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token", { status: 401 });
  }

  // Validate the calendar token against the profile
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, calendarToken: token },
    select: { id: true, name: true },
  });

  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const visits = await prisma.visit.findMany({
    where: {
      profileId,
      status: { in: ["SCHEDULED", "PENDING"] },
      date: { not: null },
    },
    include: { doctor: true, facility: true },
    orderBy: { date: "asc" },
  });

  const icsContent = generateCalendarFeed(profile.name, visits);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="health-${profileId}.ics"`,
      // Prevent caching so calendar apps always get fresh data
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
