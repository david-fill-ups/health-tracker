-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProfileRelationshipType" ADD VALUE 'HALF_SIBLING';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'GRANDPARENT';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'GRANDCHILD';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'AUNT_UNCLE';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'NIECE_NEPHEW';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'COUSIN';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_PARENT';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'STEP_CHILD';
ALTER TYPE "ProfileRelationshipType" ADD VALUE 'IN_LAW';
