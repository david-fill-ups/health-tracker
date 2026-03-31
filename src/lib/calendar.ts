import ical, { ICalCalendarMethod, ICalEventStatus } from "ical-generator";
import type { Visit, Doctor, Facility } from "@/generated/prisma/client";

type VisitWithRelations = Visit & {
  doctor: Doctor | null;
  facility: Facility | null;
};

/**
 * Generates an iCal calendar feed for a profile's appointments.
 * Returns a string in iCal format (.ics).
 */
export function generateCalendarFeed(
  profileName: string,
  visits: VisitWithRelations[],
  timezone?: string
): string {
  const cal = ical({
    name: `${profileName} - Health Tracker`,
    method: ICalCalendarMethod.PUBLISH,
    description: `Health appointments for ${profileName}`,
    ...(timezone ? { timezone } : {}),
  });

  for (const visit of visits) {
    if (!visit.date) continue;

    const providerName =
      visit.doctor?.name ?? visit.facility?.name ?? "Appointment";

    const summary = `${formatVisitType(visit.type)}: ${providerName}`;

    cal.createEvent({
      start: visit.date,
      end: new Date(visit.date.getTime() + 60 * 60 * 1000), // Default 1h duration
      summary,
      description: visit.notes ?? undefined,
      status: visit.status === "CANCELLED" ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
      ...(timezone ? { timezone } : {}),
    });
  }

  return cal.toString();
}

function formatVisitType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
