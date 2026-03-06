import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import cdcData from "../data/cdc-schedule.json";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ─── CDC Schedule ──────────────────────────────────────────────────────────
  const existingVersion = await prisma.cdcScheduleVersion.findFirst({
    where: { version: cdcData.lastUpdated },
  });

  if (!existingVersion) {
    await prisma.cdcScheduleVersion.create({
      data: {
        version: cdcData.lastUpdated,
        lastUpdated: new Date(cdcData.lastUpdated),
        data: cdcData as object,
      },
    });
    console.log(`✅ CDC schedule seeded (version: ${cdcData.lastUpdated})`);
  } else {
    console.log(`⏭️  CDC schedule already up to date (version: ${cdcData.lastUpdated})`);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
