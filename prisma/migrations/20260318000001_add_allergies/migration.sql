-- CreateTable
CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "category" TEXT,
    "diagnosisDate" TIMESTAMP(3),
    "whealSize" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Allergy_profileId_idx" ON "Allergy"("profileId");

-- AddForeignKey
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
