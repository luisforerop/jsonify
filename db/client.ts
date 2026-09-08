import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

/**
 * A single `pg` pool per process. Next's dev server re-evaluates modules on hot
 * reload, so the pool is stashed on `globalThis` outside production to avoid
 * leaking connections until Postgres refuses new ones.
 *
 * Everything is lazy: importing this module never opens a connection and never
 * requires `DATABASE_URL` — only the first actual query does. That keeps tests
 * that substitute fake repositories from needing a database at all.
 */
const globalForDb = globalThis as unknown as {
  __jsonifyPool?: Pool;
  __jsonifyDb?: NodePgDatabase<typeof schema>;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `npm run db:up`, copy .env.example to .env.local, and set it there.",
    );
  }
  return url;
}

function init(): NodePgDatabase<typeof schema> {
  if (globalForDb.__jsonifyDb) return globalForDb.__jsonifyDb;

  const pool =
    globalForDb.__jsonifyPool ??
    new Pool({ connectionString: connectionString() });
  const instance = drizzle(pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__jsonifyPool = pool;
    globalForDb.__jsonifyDb = instance;
  }
  return instance;
}

/** Lazily-initialised Drizzle client. `db.select(...)` triggers the first connect. */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get: (_target, prop, receiver) => Reflect.get(init(), prop, receiver),
});

export type Db = NodePgDatabase<typeof schema>;
export { schema };
