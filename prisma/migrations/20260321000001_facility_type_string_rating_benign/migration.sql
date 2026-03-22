-- Convert FacilityType enum column to plain text
ALTER TABLE "Facility" ALTER COLUMN "type" TYPE TEXT;

-- Drop the now-unused FacilityType enum
DROP TYPE IF EXISTS "FacilityType";

-- Add rating field to Facility
ALTER TABLE "Facility" ADD COLUMN "rating" DOUBLE PRECISION;

-- Add rating field to Doctor
ALTER TABLE "Doctor" ADD COLUMN "rating" DOUBLE PRECISION;

-- Add BENIGN to ConditionStatus enum
ALTER TYPE "ConditionStatus" ADD VALUE IF NOT EXISTS 'BENIGN';
