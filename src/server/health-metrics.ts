import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function getHealthMetricsForProfile(
  userId: string,
  profileId: string,
  metricType?: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.healthMetric.findMany({
    where: { profileId, ...(metricType ? { metricType } : {}) },
    orderBy: { measuredAt: "desc" },
  });
}

export interface CreateHealthMetricInput {
  metricType: string;
  value: number;
  unit: string;
  measuredAt: Date;
  notes?: string;
}

export async function getHealthMetricById(
  userId: string,
  profileId: string,
  metricId: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.healthMetric.findUnique({ where: { id: metricId, profileId } });
}

export async function createHealthMetric(
  userId: string,
  profileId: string,
  input: CreateHealthMetricInput
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { metricType, value, unit, measuredAt, notes } = input;
  const metric = await prisma.healthMetric.create({
    data: { metricType, value, unit, measuredAt, notes, profileId },
  });
  await logAudit(userId, profileId, "CREATE_HEALTH_METRIC", "HealthMetric", metric.id, { metricType });
  return metric;
}

export async function updateHealthMetric(
  userId: string,
  profileId: string,
  metricId: string,
  input: Partial<CreateHealthMetricInput>
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { metricType, value, unit, measuredAt, notes } = input;
  const metric = await prisma.healthMetric.update({
    where: { id: metricId, profileId },
    data: { metricType, value, unit, measuredAt, notes },
  });
  await logAudit(userId, profileId, "UPDATE_HEALTH_METRIC", "HealthMetric", metricId);
  return metric;
}

export async function getDistinctMetricInfo(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  // Get all distinct (metricType, unit) combos, most-recent first
  const entries = await prisma.healthMetric.findMany({
    where: { profileId },
    select: { metricType: true, unit: true },
    orderBy: { measuredAt: "desc" },
    distinct: ["metricType", "unit"],
  });
  // Group: first occurrence of each metricType = last used unit
  const map: Record<string, { lastUnit: string; units: string[] }> = {};
  for (const e of entries) {
    if (!map[e.metricType]) {
      map[e.metricType] = { lastUnit: e.unit, units: [e.unit] };
    } else {
      map[e.metricType].units.push(e.unit);
    }
  }
  return map;
}

export async function deleteHealthMetric(
  userId: string,
  profileId: string,
  metricId: string
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  await logAudit(userId, profileId, "DELETE_HEALTH_METRIC", "HealthMetric", metricId);
  return prisma.healthMetric.delete({ where: { id: metricId, profileId } });
}
