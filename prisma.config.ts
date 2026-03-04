import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 * - URLs live here (not in schema.prisma)
 * - DIRECT_URL is used by prisma migrate (bypasses Neon connection pooler)
 * - Runtime client uses DATABASE_URL via the pg adapter (see src/lib/prisma.ts)
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
