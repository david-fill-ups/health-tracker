-- Vaccination Parent/Dose Refactor
-- Converts flat Vaccination records into a two-level hierarchy:
--   Vaccination (parent) - canonical name per profile
--   Dose (child)         - individual administration records
-- NOTE: The "Vaccination" table was already renamed to "_OldVaccination" in a
-- prior partial run. This migration completes the refactor from that state.

-- Step 1: Rename old PK index to free up the "Vaccination_pkey" name
ALTER INDEX "Vaccination_pkey" RENAME TO "_OldVaccination_pkey";

-- Step 2: Create new Vaccination table (canonical name + aliases per profile)
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create Dose table
CREATE TABLE "Dose" (
    "id" TEXT NOT NULL,
    "vaccinationId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "VaccinationSource" NOT NULL DEFAULT 'ADMINISTERED',
    "facilityId" TEXT,
    "lotNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dose_pkey" PRIMARY KEY ("id")
);

-- Step 4: Migrate data — one Vaccination per unique (profileId, name)
INSERT INTO "Vaccination" ("id", "profileId", "name", "aliases", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "profileId",
    "name",
    '{}',
    MIN("createdAt"),
    NOW()
FROM "_OldVaccination"
GROUP BY "profileId", "name";

-- Step 5: Migrate Doses — each old Vaccination row becomes a Dose
INSERT INTO "Dose" ("id", "vaccinationId", "profileId", "name", "date", "source", "facilityId", "lotNumber", "notes", "createdAt", "updatedAt")
SELECT
    o."id",
    v."id",
    o."profileId",
    NULL,
    o."date",
    o."source",
    o."facilityId",
    o."lotNumber",
    o."notes",
    o."createdAt",
    o."updatedAt"
FROM "_OldVaccination" o
JOIN "Vaccination" v ON v."profileId" = o."profileId" AND v."name" = o."name";

-- Step 6: Add unique constraint and indexes for Vaccination
CREATE UNIQUE INDEX "Vaccination_profileId_name_key" ON "Vaccination"("profileId", "name");
CREATE INDEX "Vaccination_profileId_idx" ON "Vaccination"("profileId");

-- Step 7: Add indexes for Dose
CREATE INDEX "Dose_vaccinationId_idx" ON "Dose"("vaccinationId");
CREATE INDEX "Dose_profileId_idx" ON "Dose"("profileId");
CREATE INDEX "Dose_facilityId_idx" ON "Dose"("facilityId");

-- Step 8: Add FK constraints for Vaccination
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Add FK constraints for Dose
ALTER TABLE "Dose" ADD CONSTRAINT "Dose_vaccinationId_fkey"
    FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Dose" ADD CONSTRAINT "Dose_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Dose" ADD CONSTRAINT "Dose_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 10: Drop old table (all data migrated above)
DROP TABLE "_OldVaccination";
