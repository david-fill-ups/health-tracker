import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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
  notes?: string;
  active?: boolean;
}

export async function createDoctor(
  userId: string,
  profileId: string,
  input: CreateDoctorInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, specialty, facilityId, websiteUrl, portalUrl, phone, notes, active } = input;
  const doctor = await prisma.doctor.create({ data: { name, specialty, facilityId, websiteUrl, portalUrl, phone, notes, active, profileId } });
  await logAudit(userId, profileId, "CREATE_DOCTOR", "Doctor", doctor.id, { name: doctor.name });
  return doctor;
}

export async function updateDoctor(
  userId: string,
  profileId: string,
  doctorId: string,
  input: Partial<CreateDoctorInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, specialty, facilityId, websiteUrl, portalUrl, phone, notes, active } = input;
  const doctor = await prisma.doctor.update({ where: { id: doctorId, profileId }, data: { name, specialty, facilityId, websiteUrl, portalUrl, phone, notes, active } });
  await logAudit(userId, profileId, "UPDATE_DOCTOR", "Doctor", doctorId);
  return doctor;
}

export async function deleteDoctor(
  userId: string,
  profileId: string,
  doctorId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_DOCTOR", "Doctor", doctorId);
  return prisma.doctor.delete({ where: { id: doctorId, profileId } });
}
