import { prisma } from "./prisma";
import type { ProfilePermission } from "@/generated/prisma/enums";

type PermissionLevel = "READ_ONLY" | "WRITE" | "OWNER";

const PERMISSION_LEVELS: Record<ProfilePermission, number> = {
  READ_ONLY: 0,
  WRITE: 1,
  OWNER: 2,
};

/**
 * Verifies that `userId` has at least `required` access to `profileId`.
 * Throws a structured error if access is denied.
 *
 * Usage in API routes:
 *   await assertProfileAccess(session.user.id, profileId, "OWNER");
 */
export async function assertProfileAccess(
  userId: string,
  profileId: string,
  required: PermissionLevel = "READ_ONLY"
): Promise<void> {
  const access = await prisma.profileAccess.findUnique({
    where: { profileId_userId: { profileId, userId } },
    select: { permission: true },
  });

  if (!access) {
    throw new PermissionError("UNAUTHORIZED", 401);
  }

  if (PERMISSION_LEVELS[access.permission] < PERMISSION_LEVELS[required]) {
    throw new PermissionError("FORBIDDEN", 403);
  }
}

/**
 * Returns true if `userId` has at least `required` access to `profileId`.
 * Non-throwing variant for conditional UI logic.
 */
export async function hasProfileAccess(
  userId: string,
  profileId: string,
  required: PermissionLevel = "READ_ONLY"
): Promise<boolean> {
  try {
    await assertProfileAccess(userId, profileId, required);
    return true;
  } catch {
    return false;
  }
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403
  ) {
    super(message);
    this.name = "PermissionError";
  }
}
