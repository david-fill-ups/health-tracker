-- Combo Doses: Many-to-Many Dose ↔ Vaccination
-- A single combo shot (e.g. Vaxelis = DTaP+Hib+HepB+IPV) can now be linked
-- to multiple canonical Vaccination records via a join table.

-- Step 1: Create the join table
CREATE TABLE "DoseVaccination" (
    "doseId"        TEXT NOT NULL,
    "vaccinationId" TEXT NOT NULL,
    CONSTRAINT "DoseVaccination_pkey" PRIMARY KEY ("doseId", "vaccinationId")
);
CREATE INDEX "DoseVaccination_vaccinationId_idx" ON "DoseVaccination"("vaccinationId");

ALTER TABLE "DoseVaccination"
    ADD CONSTRAINT "DoseVaccination_doseId_fkey"
        FOREIGN KEY ("doseId") REFERENCES "Dose"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoseVaccination"
    ADD CONSTRAINT "DoseVaccination_vaccinationId_fkey"
        FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 2: Populate join table from existing one-to-many FK
INSERT INTO "DoseVaccination" ("doseId", "vaccinationId")
SELECT "id", "vaccinationId" FROM "Dose"
WHERE "vaccinationId" IS NOT NULL;

-- Step 3: Drop the old FK column
ALTER TABLE "Dose" DROP COLUMN "vaccinationId";
