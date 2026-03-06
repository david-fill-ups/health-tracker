import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE_PROFILE"    | "UPDATE_PROFILE"    | "DELETE_PROFILE"    | "REGENERATE_CALENDAR_TOKEN"
  | "CREATE_VISIT"      | "UPDATE_VISIT"      | "DELETE_VISIT"
  | "CREATE_MEDICATION" | "UPDATE_MEDICATION" | "DELETE_MEDICATION"
  | "CREATE_MEDICATION_LOG"
  | "CREATE_CONDITION"  | "UPDATE_CONDITION"  | "DELETE_CONDITION"
  | "CREATE_VACCINATION"| "UPDATE_VACCINATION"| "DELETE_VACCINATION"
  | "CREATE_FACILITY"   | "UPDATE_FACILITY"   | "DELETE_FACILITY"
  | "CREATE_DOCTOR"     | "UPDATE_DOCTOR"     | "DELETE_DOCTOR";

/**
 * Write an immutable audit log entry.
 * Failures are caught and logged — a logging error must never crash the main operation.
 */
export async function logAudit(
  userId: string,
  profileId: string | null,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, profileId, action, entityType, entityId, metadata: metadata as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", { action, userId, profileId, entityId, err });
  }
}

