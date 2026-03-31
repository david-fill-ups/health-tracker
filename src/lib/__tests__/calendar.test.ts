import { describe, it, expect } from "vitest";
import { generateCalendarFeed } from "@/lib/calendar";
import type { Visit, Doctor, Facility } from "@/generated/prisma/client";

type VisitWithRelations = Visit & {
  doctor: Doctor | null;
  facility: Facility | null;
};

function makeVisit(overrides: Partial<VisitWithRelations> = {}): VisitWithRelations {
  return {
    id: "visit-1",
    profileId: "profile-1",
    doctorId: null,
    facilityId: null,
    locationId: null,
    date: new Date("2026-04-15T10:00:00Z"),
    dueMonth: null,
    type: "ROUTINE",
    notes: null,
    status: "SCHEDULED",
    createdAt: new Date(),
    updatedAt: new Date(),
    doctor: null,
    facility: null,
    ...overrides,
  };
}

describe("generateCalendarFeed", () => {
  it("returns a non-empty iCal string", () => {
    const result = generateCalendarFeed("Jane", [makeVisit()]);
    expect(typeof result).toBe("string");
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
  });

  it("skips visits without a date", () => {
    const withDate = makeVisit({ id: "v1", date: new Date("2026-04-15T10:00:00Z") });
    const noDate = makeVisit({ id: "v2", date: null });
    const result = generateCalendarFeed("Jane", [withDate, noDate]);
    // Only one VEVENT for the visit that has a date
    const eventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(1);
  });

  it("uses doctor name as provider when available", () => {
    const visit = makeVisit({
      doctor: { id: "d1", name: "Dr. Smith", specialty: null, facilityId: null, npiNumber: null, credential: null, photo: null, npiLastSynced: null, rating: null, websiteUrl: null, portalUrl: null, phone: null, notes: null, active: true, profileId: "profile-1", createdAt: new Date(), updatedAt: new Date() },
    });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("Dr. Smith");
  });

  it("falls back to facility name when no doctor", () => {
    const visit = makeVisit({
      doctor: null,
      facility: { id: "f1", name: "City Clinic", type: "CLINIC", npiNumber: null, npiLastSynced: null, rating: null, websiteUrl: null, portalUrl: null, phone: null, notes: null, active: true, profileId: "profile-1", createdAt: new Date(), updatedAt: new Date() },
    });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("City Clinic");
  });

  it("falls back to 'Appointment' when neither doctor nor facility", () => {
    const visit = makeVisit({ doctor: null, facility: null });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("Appointment");
  });

  it("sets CANCELLED status for cancelled visits", () => {
    const visit = makeVisit({ status: "CANCELLED" });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("STATUS:CANCELLED");
  });

  it("sets CONFIRMED status for non-cancelled visits", () => {
    const visit = makeVisit({ status: "SCHEDULED" });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("STATUS:CONFIRMED");
  });

  it("sets end time 1 hour after start", () => {
    const start = new Date("2026-04-15T10:00:00Z");
    const visit = makeVisit({ date: start });
    const result = generateCalendarFeed("Jane", [visit]);
    // iCal format: DTEND:20260415T110000Z
    expect(result).toContain("20260415T110000Z");
  });

  it("includes notes in description when present", () => {
    const visit = makeVisit({ notes: "Bring lab results" });
    const result = generateCalendarFeed("Jane", [visit]);
    expect(result).toContain("Bring lab results");
  });

  it("returns empty calendar (no events) for empty visits array", () => {
    const result = generateCalendarFeed("Jane", []);
    expect(result).toContain("BEGIN:VCALENDAR");
    const eventCount = (result.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventCount).toBe(0);
  });

  it("uses profile name in calendar title", () => {
    const result = generateCalendarFeed("John Doe", []);
    expect(result).toContain("John Doe");
  });

  it("outputs UTC Z times when no timezone is provided", () => {
    const result = generateCalendarFeed("Jane", [makeVisit()]);
    expect(result).toContain("DTSTART:20260415T100000Z");
  });

  it("outputs TZID when timezone is provided", () => {
    const result = generateCalendarFeed("Jane", [makeVisit()], "America/New_York");
    expect(result).toContain("TZID=America/New_York");
    expect(result).not.toContain("DTSTART:20260415T100000Z");
  });

  it("uses hyphen (not em dash) in calendar name", () => {
    const result = generateCalendarFeed("Jane", []);
    expect(result).toContain("Jane - Health Tracker");
    expect(result).not.toContain("Jane \u2014 Health Tracker");
  });
});
