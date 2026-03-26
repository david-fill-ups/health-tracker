-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "credential" TEXT,
ADD COLUMN     "npiLastSynced" TIMESTAMP(3),
ADD COLUMN     "npiNumber" TEXT,
ADD COLUMN     "photo" TEXT;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "npiLastSynced" TIMESTAMP(3),
ADD COLUMN     "npiNumber" TEXT;
