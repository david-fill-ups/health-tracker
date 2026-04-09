-- Remove active flag from Location (managed at Facility level instead)
ALTER TABLE "Location" DROP COLUMN IF EXISTS "active";

-- Add primaryLocationId to Doctor (soft-validated to doctor's facility locations in UI)
ALTER TABLE "Doctor" ADD COLUMN "primaryLocationId" TEXT;
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Doctor_primaryLocationId_idx" ON "Doctor"("primaryLocationId");
