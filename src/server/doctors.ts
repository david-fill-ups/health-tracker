import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";

export async function getDoctorsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.doctor.findMany({
    where: { profileId },
    include: { facility: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export interface CreateDoctorInput {
  name: string;
  specialty?: string;
  facilityId?: string;
  websiteUrl?: string;
  portalUrl?: string;
  phone?: string;
  active?: boolean;
}

export async function createDoctor(
  userId: string,
  profileId: string,
  input: CreateDoctorInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.doctor.create({ data: { ...input, profileId } });
}

export async function updateDoctor(
  userId: string,
  profileId: string,
  doctorId: string,
  input: Partial<CreateDoctorInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.doctor.update({ where: { id: doctorId, profileId }, data: input });
}

export async function deleteDoctor(
  userId: string,
  profileId: string,
  doctorId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.doctor.delete({ where: { id: doctorId, profileId } });
}
