-- CreateTable
CREATE TABLE "Portal" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "url" TEXT NOT NULL,
    "facilityId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portal_profileId_idx" ON "Portal"("profileId");

-- CreateIndex
CREATE INDEX "Portal_facilityId_idx" ON "Portal"("facilityId");

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
