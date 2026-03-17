-- Migrate birthYear (Int) → birthDate (DateTime)
-- Backfill existing rows using January 1 of their stored birth year.

ALTER TABLE "Profile" ADD COLUMN "birthDate" TIMESTAMP(3);
UPDATE "Profile" SET "birthDate" = make_date("birthYear", 1, 1)::timestamp;
ALTER TABLE "Profile" ALTER COLUMN "birthDate" SET NOT NULL;
ALTER TABLE "Profile" DROP COLUMN "birthYear";
