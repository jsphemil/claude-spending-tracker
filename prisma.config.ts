import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7.9's `datasource` config no longer has a `directUrl` field (that
// existed in 7.6 but was removed since). DATABASE_URL below is Supabase's
// pooled/pgbouncer connection, used by the app at runtime via the driver
// adapter (see src/lib/db/prisma.ts). Migration commands must bypass the
// pooler, so run them with an explicit override instead:
//   npx prisma migrate dev --url "$DIRECT_URL"
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
