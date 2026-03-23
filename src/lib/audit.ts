import { prisma } from "./prisma";

export type AuditAction =
  | "DELETE_ACCOUNT"
  | "CREATE_PROFILE"    | "UPDATE_PROFILE"    | "DELETE_PROFILE"    | "REGENERATE_CALENDAR_TOKEN"
  | "SHARE_PROFILE"     | "SHARE_PROFILE_INVITE" | "UPDATE_PROFILE_ACCESS" | "REVOKE_PROFILE_ACCESS" | "CANCEL_PROFILE_INVITE"
  | "CREATE_VISIT"      | "UPDATE_VISIT"      | "DELETE_VISIT"
  | "CREATE_MEDICATION" | "UPDATE_MEDICATION" | "DELETE_MEDICATION"
  | "CREATE_MEDICATION_LOG" | "UPDATE_MEDICATION_LOG" | "DELETE_MEDICATION_LOG"
  | "CREATE_CONDITION"  | "UPDATE_CONDITION"  | "DELETE_CONDITION"
  | "CREATE_VACCINATION"| "UPDATE_VACCINATION"| "DELETE_VACCINATION"
  | "CREATE_FACILITY"   | "UPDATE_FACILITY"   | "DELETE_FACILITY"
  | "CREATE_LOCATION"   | "UPDATE_LOCATION"   | "DELETE_LOCATION"
  | "CREATE_DOCTOR"     | "UPDATE_DOCTOR"     | "DELETE_DOCTOR"
  | "CREATE_ALLERGY"   | "UPDATE_ALLERGY"    | "DELETE_ALLERGY"
  | "CREATE_PORTAL"    | "UPDATE_PORTAL"     | "DELETE_PORTAL"
  | "CREATE_HEALTH_METRIC" | "UPDATE_HEALTH_METRIC" | "DELETE_HEALTH_METRIC"
  | "CREATE_FAMILY_MEMBER"        | "UPDATE_FAMILY_MEMBER"        | "DELETE_FAMILY_MEMBER"
  | "CREATE_FAMILY_CONDITION"     | "UPDATE_FAMILY_CONDITION"     | "DELETE_FAMILY_CONDITION"
  | "CREATE_PROFILE_RELATIONSHIP" | "UPDATE_PROFILE_RELATIONSHIP" | "DELETE_PROFILE_RELATIONSHIP"
  | "IMPORT_PROFILE";

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

