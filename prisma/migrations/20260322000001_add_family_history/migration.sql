-- CreateEnum
CREATE TYPE "FamilySide" AS ENUM ('MATERNAL', 'PATERNAL');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('PARENT', 'SIBLING', 'GRANDFATHER', 'GRANDMOTHER', 'AUNT', 'UNCLE');

-- CreateEnum
CREATE TYPE "ProfileRelationshipType" AS ENUM ('SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'OTHER');

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "side" "FamilySide",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyCondition" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRelationship" (
    "id" TEXT NOT NULL,
    "fromProfileId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "relationship" "ProfileRelationshipType" NOT NULL,
    "biological" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileRelationship_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Portal add active column
ALTER TABLE "Portal" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Facility type default
ALTER TABLE "Facility" ALTER COLUMN "type" SET DEFAULT 'CLINIC';

-- CreateIndex
CREATE INDEX "FamilyMember_profileId_idx" ON "FamilyMember"("profileId");

-- CreateIndex
CREATE INDEX "FamilyCondition_familyMemberId_idx" ON "FamilyCondition"("familyMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileRelationship_fromProfileId_toProfileId_key" ON "ProfileRelationship"("fromProfileId", "toProfileId");

-- CreateIndex
CREATE INDEX "ProfileRelationship_fromProfileId_idx" ON "ProfileRelationship"("fromProfileId");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyCondition" ADD CONSTRAINT "FamilyCondition_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRelationship" ADD CONSTRAINT "ProfileRelationship_fromProfileId_fkey" FOREIGN KEY ("fromProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRelationship" ADD CONSTRAINT "ProfileRelationship_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
