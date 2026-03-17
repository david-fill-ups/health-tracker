-- Add indexes for frequently queried foreign key columns

-- Account
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- Session
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- ProfileInvitation (email used in createUser event to find pending invitations)
CREATE INDEX IF NOT EXISTS "ProfileInvitation_email_idx" ON "ProfileInvitation"("email");

-- Facility
CREATE INDEX IF NOT EXISTS "Facility_profileId_idx" ON "Facility"("profileId");

-- Location
CREATE INDEX IF NOT EXISTS "Location_facilityId_idx" ON "Location"("facilityId");

-- Doctor
CREATE INDEX IF NOT EXISTS "Doctor_profileId_idx" ON "Doctor"("profileId");
CREATE INDEX IF NOT EXISTS "Doctor_facilityId_idx" ON "Doctor"("facilityId");

-- Visit
CREATE INDEX IF NOT EXISTS "Visit_profileId_idx" ON "Visit"("profileId");
CREATE INDEX IF NOT EXISTS "Visit_doctorId_idx" ON "Visit"("doctorId");
CREATE INDEX IF NOT EXISTS "Visit_facilityId_idx" ON "Visit"("facilityId");
CREATE INDEX IF NOT EXISTS "Visit_locationId_idx" ON "Visit"("locationId");

-- Medication
CREATE INDEX IF NOT EXISTS "Medication_profileId_idx" ON "Medication"("profileId");
CREATE INDEX IF NOT EXISTS "Medication_prescribingDoctorId_idx" ON "Medication"("prescribingDoctorId");

-- MedicationLog
CREATE INDEX IF NOT EXISTS "MedicationLog_medicationId_idx" ON "MedicationLog"("medicationId");

-- Condition
CREATE INDEX IF NOT EXISTS "Condition_profileId_idx" ON "Condition"("profileId");

-- Vaccination
CREATE INDEX IF NOT EXISTS "Vaccination_profileId_idx" ON "Vaccination"("profileId");
CREATE INDEX IF NOT EXISTS "Vaccination_facilityId_idx" ON "Vaccination"("facilityId");
