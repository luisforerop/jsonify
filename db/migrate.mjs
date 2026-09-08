/**
 * Standalone migration runner for deploys.
 *
 * `npm run db:migrate` uses drizzle-kit, which lives in devDependencies and is
 * pruned from the production image. This script only needs `drizzle-orm` and
 * `pg` (both runtime dependencies), so it works inside the deployed container.
 *
 * It reads db/migrations/ (ordering them via meta/_journal.json) and records
 * what it applies in the drizzle.__drizzle_migrations table, so re-runs on every
 * container boot are safe no-ops once everything is applied.
 */
import { loadEnvFile } from "node:process";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// In a deploy the env vars are already set. For a local `npm run db:deploy`,
// load the same files Next and drizzle-kit would.
for (const file of [".env.local", ".env"]) {
  try {
    loadEnvFile(file);
  } catch {
    // optional
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set; cannot run migrations.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  await migrate(drizzle(pool), { migrationsFolder: "./db/migrations" });
  console.log("Migrations up to date.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
