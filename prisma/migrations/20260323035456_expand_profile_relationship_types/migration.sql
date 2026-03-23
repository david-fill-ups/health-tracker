-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MOTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'FATHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'DAUGHTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'SON';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'SISTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'BROTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'HALF_SISTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'HALF_BROTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MATERNAL_GRANDMOTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MATERNAL_GRANDFATHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'PATERNAL_GRANDMOTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'PATERNAL_GRANDFATHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'GRANDDAUGHTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'GRANDSON';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MATERNAL_AUNT';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MATERNAL_UNCLE';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'PATERNAL_AUNT';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'PATERNAL_UNCLE';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'NIECE';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'NEPHEW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_MOTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_FATHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_DAUGHTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_SON';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_SISTER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_BROTHER';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'MOTHER_IN_LAW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'FATHER_IN_LAW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'DAUGHTER_IN_LAW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'SON_IN_LAW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'SISTER_IN_LAW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'BROTHER_IN_LAW';
