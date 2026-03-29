-- CreateEnum
CREATE TYPE "MedicationType" AS ENUM ('ORAL', 'INJECTABLE', 'TOPICAL', 'INHALER', 'SUPPLEMENT', 'DEVICE', 'OTHER');

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "medicationType" "MedicationType" NOT NULL DEFAULT 'ORAL';
