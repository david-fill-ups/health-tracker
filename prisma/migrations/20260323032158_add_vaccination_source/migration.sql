-- CreateEnum
CREATE TYPE "VaccinationSource" AS ENUM ('ADMINISTERED', 'NATURAL', 'DECLINED');

-- AlterTable
ALTER TABLE "Facility" ALTER COLUMN "type" SET DEFAULT 'Clinic';

-- AlterTable
ALTER TABLE "Vaccination" ADD COLUMN     "source" "VaccinationSource" NOT NULL DEFAULT 'ADMINISTERED';
